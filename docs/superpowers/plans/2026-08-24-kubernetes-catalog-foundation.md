# Kubernetes Catalog Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the Kubernetes catalog on a sound footing — integrity tests, ten `k8s-*` categories replacing the flat `orchestration` one, and the 19 stub topics rewritten to Shape A in their own chunked files.

**Architecture:** Content and information architecture only; no renderer changes. Categories are declared in `devopsTopics.js`; topic-to-category assignment is a map edit. New and rewritten topics move out of the 2.5 MB `devopsTopics.js` into per-category files under `data/capra/topics/`, which Vite's existing `manualChunks` rule automatically emits as separate cacheable chunks. A barrel module merges them for `loader.js`. Vitest guards both directions of the two-lists-must-agree failure that this catalog is prone to.

**Tech Stack:** React 19, Vite 8, Vitest 4.1.5 (jsdom, globals, configured in `apps/camora/vite.config.ts`), plain ES modules for topic data.

**Spec:** `docs/superpowers/specs/2026-08-23-kubernetes-catalog-parity-design.md`

## Scope

This plan covers **Phases 0–2** of the spec: the guard rails, the IA change, and the rewrite of the 19 Shape-C stubs that belong to Kubernetes categories. It delivers a working, testable improvement on its own — every existing topic stays reachable, the depth floor becomes enforceable, and the worst stubs become full topics.

**Phases 3–8 (the 89 new topics) are not in this plan.** They get one plan per category, written after Task 3 proves the fetch-author-migrate pipeline end to end. Writing them now would be guessing at a template that hasn't been exercised.

**On the authoring steps.** Topic prose is not reproduced in this plan, by design — it is generated during the task from the `WebFetch` in that task's first step. What the plan does fix exactly: which URLs to fetch, what to extract from them, the schema every topic must conform to, the section titles to write against, and the test that rejects the result if it comes out thin. An authoring step reading "fill `content` from the Step 1 fetch" is complete as written; the ellipses inside the Task 3 example mark where fetched material goes, not missing plan detail.

## Global Constraints

- **Schema:** Shape A only for every topic in a `k8s-*` category — `{ id, title, icon, color, questions, description, introduction, topics[], quickFire[], references[] }`.
- **Depth floor:** `introduction` non-empty; `topics[]` ≥ 3 sections; `quickFire[]` ≥ 5 pairs; `references[]` ≥ 1 `https://kubernetes.io/` URL. Target 15–25 KB serialized per topic.
- **Sourcing:** every topic's facts come from a `WebFetch` of its kubernetes.io pages performed during the task. Version claims (GA/beta/alpha status, feature-gate names, defaults) must come from the fetched page, never from memory.
- **Attribution:** every fetched URL goes in `references`. Paraphrase; do not reproduce kubernetes.io prose verbatim. The docs are CC BY 4.0.
- **Out of scope:** Windows sections; renderer changes; the Observability and Platform Engineering pages; non-Kubernetes DevOps categories.
- **Test command:** `cd apps/camora && npx vitest run <path>` (there is no `test` script in `package.json`).
- **Tests are colocated** as `<name>.test.ts` beside the source, matching every existing test in this app. The spec said `__tests__/`; the codebase convention wins.
- **No `vite.config.ts` change.** `manualChunks` already maps any file under `/data/capra/topics/` to its own `topic-data-<basename>` chunk.

## File Structure

| File | Responsibility |
|---|---|
| `src/data/capra/topics/catalog-integrity.test.ts` | **Create.** Guards topic↔category map agreement in both directions, plus the Shape A depth floor for migrated k8s topics. |
| `src/data/capra/topics/devopsTopics.js` | **Modify.** Add 10 `k8s-*` categories, drop `orchestration`, retarget map values, delete 6 stale map entries, remove the 19 migrated topic objects. |
| `src/data/capra/topics/k8sTopics.js` | **Create.** Barrel — merges the per-category files into `k8sTopics`, `k8sTopicCategoryMap`, `k8sCategories`. The only k8s module `loader.js` imports. |
| `src/data/capra/topics/k8sArchitectureTopics.js` | **Create.** 3 migrated topics. |
| `src/data/capra/topics/k8sWorkloadsTopics.js` | **Create.** 4 migrated topics. |
| `src/data/capra/topics/k8sNetworkingTopics.js` | **Create.** 4 migrated topics. |
| `src/data/capra/topics/k8sSchedulingTopics.js` | **Create.** 4 migrated topics. |
| `src/data/capra/topics/k8sExtendingTopics.js` | **Create.** 2 migrated topics. |
| `src/data/capra/topics/k8sClusterAdminTopics.js` | **Create.** 1 migrated topic. |
| `src/data/capra/topics/k8sBareMetalTopics.js` | **Create.** 1 migrated topic. |
| `src/data/capra/topics/loader.js:159-177` | **Modify.** Merge the barrel into the `devops` page bundle. |

The three remaining spec files (`k8sStorageTopics.js`, `k8sConfigPolicyTopics.js`, `k8sSecurityTopics.js`) have no stubs to migrate and are created by the Phase 3+ content plans.

---

### Task 1: Catalog integrity tests and stale-map cleanup

Guards the failure mode this catalog keeps hitting: a topic and its category map disagreeing, silently, because `DocsPage.jsx:3373` filters by map lookup and drops anything missing.

**Files:**
- Create: `apps/camora/src/data/capra/topics/catalog-integrity.test.ts`
- Modify: `apps/camora/src/data/capra/topics/devopsTopics.js` (delete 6 stale map entries)

**Interfaces:**
- Consumes: nothing.
- Produces: `catalog-integrity.test.ts` — later tasks add cases to this same file. The loader-equivalent merge helper it defines, `loadDevopsBundle()`, returns `{ topics, map, categoryIds }` and is reused by Tasks 2 and 4.

- [ ] **Step 1: Write the failing test**

Create `apps/camora/src/data/capra/topics/catalog-integrity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

// Mirrors the `devops` branch of loader.js exactly. If loader.js changes
// how it merges, this must change with it — that coupling is the point.
async function loadDevopsBundle() {
  const [mod, helm, flux, cp, nb, extra] = await Promise.all([
    import('./devopsTopics.js'),
    import('./helmTopics.js'),
    import('./fluxTopics.js'),
    import('./controlPlaneTopics.js'),
    import('./nativeBuildTopics.js'),
    import('./devopsTopicsExtra.js'),
  ]);
  return {
    topics: [
      ...mod.devopsTopics, ...helm.helmTopics, ...flux.fluxTopics,
      ...cp.controlPlaneTopics, ...nb.nativeBuildTopics, ...extra.devopsExtraTopics,
    ],
    map: { ...mod.devopsTopicCategoryMap, ...extra.devopsExtraTopicCategoryMap },
    categoryIds: new Set(mod.devopsCategories.map((c) => c.id)),
    // devopsTopics.js also feeds two other Prepare pages; topics routed
    // there are legitimately absent from the DevOps map.
    otherPageIds: new Set([
      ...Object.keys(mod.observabilityTopicCategoryMap),
      ...Object.keys(mod.platformTopicCategoryMap),
    ]),
  };
}

describe('devops catalog integrity', () => {
  it('routes every topic to a category on some page', async () => {
    const { topics, map, otherPageIds } = await loadDevopsBundle();
    const unrouted = topics
      .filter((t) => !(t.id in map) && !otherPageIds.has(t.id))
      .map((t) => t.id);
    expect(unrouted).toEqual([]);
  });

  it('points every map entry at a declared category', async () => {
    const { map, categoryIds } = await loadDevopsBundle();
    const bad = Object.entries(map).filter(([, cat]) => !categoryIds.has(cat));
    expect(bad).toEqual([]);
  });

  it('has no duplicate topic ids', async () => {
    const { topics } = await loadDevopsBundle();
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const t of topics) {
      if (seen.has(t.id)) dups.push(t.id);
      seen.add(t.id);
    }
    expect(dups).toEqual([]);
  });

  it('has no map entry pointing at a topic that does not exist', async () => {
    const { topics, map } = await loadDevopsBundle();
    const ids = new Set(topics.map((t) => t.id));
    const dangling = Object.keys(map).filter((id) => !ids.has(id));
    expect(dangling).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to see which fail**

Run: `cd apps/camora && npx vitest run src/data/capra/topics/catalog-integrity.test.ts`

Expected: the first three PASS. The fourth FAILS, listing exactly six dangling ids:
`therock-ci-architecture`, `therock-selective-builds`, `therock-cross-repo-dedup`, `therock-test-topology`, `therock-gpu-runners`, `osdu-multicloud-cicd`.

These are map entries whose topic objects do not exist anywhere in the repo — verified by grepping all of `apps/camora/src`. They render nothing today.

- [ ] **Step 3: Delete the six stale map entries**

In `apps/camora/src/data/capra/topics/devopsTopics.js`, inside `devopsTopicCategoryMap`, delete these six lines (near line 230):

```js
  'therock-ci-architecture':        'nativebuild',
  'therock-selective-builds':       'nativebuild',
  'therock-cross-repo-dedup':       'nativebuild',
  'therock-test-topology':          'nativebuild',
  'therock-gpu-runners':            'nativebuild',
  'osdu-multicloud-cicd':           'cicdtools',
```

Do not delete anything else — the exact keys are listed above and each appears once.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/camora && npx vitest run src/data/capra/topics/catalog-integrity.test.ts`

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/data/capra/topics/catalog-integrity.test.ts apps/camora/src/data/capra/topics/devopsTopics.js
git commit -m "test(capra): guard topic-to-category map agreement in both directions

DocsPage filters topics by map lookup, so a topic missing from the map
renders nowhere and a map entry with no topic renders nothing — both fail
silently. Six entries were already dangling: five therock-* and
osdu-multicloud-cicd, pointing at topic objects that exist nowhere in the
repo. Removed them and locked all four invariants down."
```

---

### Task 2: Ten Kubernetes categories replacing the flat one

Pure IA. No prose is written and no topic object moves — only category declarations and map values change, so this is revertible on its own.

**Files:**
- Modify: `apps/camora/src/data/capra/topics/devopsTopics.js` (`devopsCategories` ~line 11, `devopsTopicCategoryMap` ~line 30)
- Modify: `apps/camora/src/data/capra/topics/catalog-integrity.test.ts` (add cases)

**Interfaces:**
- Consumes: `loadDevopsBundle()` from Task 1.
- Produces: ten category ids — `k8s-architecture`, `k8s-workloads`, `k8s-networking`, `k8s-storage`, `k8s-config-policy`, `k8s-security`, `k8s-scheduling`, `k8s-cluster-admin`, `k8s-baremetal`, `k8s-extending`. Tasks 3 and 5–9 assign topics to these exact ids.

- [ ] **Step 1: Write the failing test**

Append to `apps/camora/src/data/capra/topics/catalog-integrity.test.ts`:

```ts
const K8S_CATEGORY_IDS = [
  'k8s-architecture', 'k8s-workloads', 'k8s-networking', 'k8s-storage',
  'k8s-config-policy', 'k8s-security', 'k8s-scheduling', 'k8s-cluster-admin',
  'k8s-baremetal', 'k8s-extending',
];

describe('kubernetes category structure', () => {
  it('declares all ten k8s categories', async () => {
    const { categoryIds } = await loadDevopsBundle();
    const missing = K8S_CATEGORY_IDS.filter((id) => !categoryIds.has(id));
    expect(missing).toEqual([]);
  });

  it('has retired the flat orchestration category', async () => {
    const { categoryIds, map } = await loadDevopsBundle();
    expect(categoryIds.has('orchestration')).toBe(false);
    const stragglers = Object.entries(map)
      .filter(([, cat]) => cat === 'orchestration')
      .map(([id]) => id);
    expect(stragglers).toEqual([]);
  });

  it('leaves no k8s category empty', async () => {
    const { map } = await loadDevopsBundle();
    const empty = K8S_CATEGORY_IDS.filter(
      (cat) => !Object.values(map).includes(cat),
    );
    expect(empty).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/camora && npx vitest run src/data/capra/topics/catalog-integrity.test.ts`

Expected: the three new cases FAIL — no `k8s-*` category is declared yet and `orchestration` still exists. The four Task 1 cases still PASS.

- [ ] **Step 3: Replace the orchestration category with ten**

In `devopsCategories`, delete this line:

```js
  { id: 'orchestration',    name: 'Orchestration & Kubernetes',        icon: 'gitBranch',     color: '#14b8a6' },
```

and insert in its place:

```js
  { id: 'k8s-architecture',  name: 'Kubernetes — Architecture & the API',     icon: 'gitBranch', color: '#14b8a6' },
  { id: 'k8s-workloads',     name: 'Kubernetes — Workloads & Pods',           icon: 'package',   color: '#0d9488' },
  { id: 'k8s-networking',    name: 'Kubernetes — Networking & Service Discovery', icon: 'share2', color: '#0891b2' },
  { id: 'k8s-storage',       name: 'Kubernetes — Storage',                    icon: 'database',  color: '#7c3aed' },
  { id: 'k8s-config-policy', name: 'Kubernetes — Configuration & Policies',   icon: 'settings',  color: '#8b5cf6' },
  { id: 'k8s-security',      name: 'Kubernetes — Security',                   icon: 'shield',    color: '#ef4444' },
  { id: 'k8s-scheduling',    name: 'Kubernetes — Scheduling, Preemption & Eviction', icon: 'cpu', color: '#f59e0b' },
  { id: 'k8s-cluster-admin', name: 'Kubernetes — Cluster Administration',     icon: 'server',    color: '#475569' },
  { id: 'k8s-baremetal',     name: 'Kubernetes — Bare Metal & Production Setup', icon: 'hardDrive', color: '#ea580c' },
  { id: 'k8s-extending',     name: 'Kubernetes — Extending Kubernetes',       icon: 'codepen',   color: '#22c55e' },
```

- [ ] **Step 4: Retarget the 34 map entries**

In `devopsTopicCategoryMap`, change the value of each key below. Every one of these currently reads `'orchestration'`.

```js
  // Architecture & the API
  'kubernetes-architecture':        'k8s-architecture',
  'kubectl-cli-reference':          'k8s-architecture',
  'local-kubernetes-setup':         'k8s-architecture',
  // Workloads & Pods
  'k8s-core-resources':             'k8s-workloads',
  'container-probes':               'k8s-workloads',
  'kubernetes-native-sidecars':     'k8s-workloads',
  'kubernetes-runtime-class':       'k8s-workloads',
  'kubernetes-autoscaling':         'k8s-workloads',
  // Networking & Service Discovery
  'kubernetes-services':            'k8s-networking',
  'kubernetes-networking':          'k8s-networking',
  'ingress-gateway-api':            'k8s-networking',
  'kubernetes-gateway-api':         'k8s-networking',
  'service-mesh':                   'k8s-networking',
  // Storage
  'kubernetes-storage':             'k8s-storage',
  // Configuration & Policies
  'kubernetes-secrets-management':  'k8s-config-policy',
  // Security
  'kubernetes-security':            'k8s-security',
  'kubernetes-rbac':                'k8s-security',
  'kubernetes-admission-control':   'k8s-security',
  'kubernetes-multitenancy':        'k8s-security',
  // Scheduling, Preemption & Eviction
  'kubernetes-pod-scheduling':      'k8s-scheduling',
  'kubernetes-custom-schedulers':   'k8s-scheduling',
  'kubernetes-descheduler':         'k8s-scheduling',
  'kubernetes-evictions':           'k8s-scheduling',
  'kubernetes-gpu-ai-scheduling':   'k8s-scheduling',
  // Cluster Administration
  'kubernetes-upgrades':            'k8s-cluster-admin',
  'kubernetes-observability':       'k8s-cluster-admin',
  'kubernetes-multicloud':          'k8s-cluster-admin',
  'kubernetes-app-troubleshooting': 'k8s-cluster-admin',
  // Bare Metal & Production Setup
  'kubeadm-provisioning':           'k8s-baremetal',
  'kubernetes-the-hard-way':        'k8s-baremetal',
  // Extending Kubernetes
  'operators-and-crds':             'k8s-extending',
  'kubernetes-api-aggregation':     'k8s-extending',
```

Two topics leave the Kubernetes tree entirely:

```js
  'helm-vs-kustomize':              'helm',
  'k8s-network-policy-guide':       'k8s-networking',
```

`k8s-network-policy-guide` lives in `devopsTopicsExtra.js` — change it in `devopsExtraTopicCategoryMap` there, not in `devopsTopics.js`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd apps/camora && npx vitest run src/data/capra/topics/catalog-integrity.test.ts`

Expected: 7 passed. If "leaves no k8s category empty" fails, a category id above has no topic assigned — check the retarget list against the category list.

- [ ] **Step 6: Verify the page renders**

Run: `cd apps/camora && npx vite build 2>&1 | tail -20`

Expected: build succeeds. Then `pnpm dev:camora`, open `/capra/prepare?page=devops`, and confirm ten Kubernetes categories appear where "Orchestration & Kubernetes" used to be, each with topics under it and none empty.

- [ ] **Step 7: Commit**

```bash
git add apps/camora/src/data/capra/topics/devopsTopics.js apps/camora/src/data/capra/topics/devopsTopicsExtra.js apps/camora/src/data/capra/topics/catalog-integrity.test.ts
git commit -m "feat(capra): split flat orchestration category into ten k8s categories

Thirty-four Kubernetes topics under one category was a wall, and it hid how
uneven they are — kubernetes-architecture sat next to kubernetes-security
looking like a peer while carrying a fifth of the content.

Categories now mirror the kubernetes.io concept tree, so a gap in coverage
shows up as a thin category instead of disappearing into a long list. This
is a map edit only: no topic object moved and no prose changed, so it can
be reverted on its own if the navigation reads worse."
```

---

### Task 3: Barrel, loader wiring, and the first rewritten topic

Proves the whole pipeline on one topic before repeating it 18 times: fetch kubernetes.io → author Shape A → move the object out of `devopsTopics.js` → merge through the barrel → tests green.

`kubernetes-architecture` goes first because it is the entry point to the subject and one of the worst stubs — 10 KB of diagram captions with no `introduction`, no `topics[]`, no `quickFire[]`.

**Files:**
- Create: `apps/camora/src/data/capra/topics/k8sArchitectureTopics.js`
- Create: `apps/camora/src/data/capra/topics/k8sTopics.js`
- Modify: `apps/camora/src/data/capra/topics/loader.js:159-177`
- Modify: `apps/camora/src/data/capra/topics/devopsTopics.js` (remove the `kubernetes-architecture` object and its map entry)

**Interfaces:**
- Consumes: the category ids from Task 2.
- Produces:
  - `k8sArchitectureTopics.js` exports `k8sArchitectureTopics` (array) and `k8sArchitectureTopicCategoryMap` (object). Every per-category file in Tasks 5–9 follows this exact `<name>Topics` / `<name>TopicCategoryMap` naming.
  - `k8sTopics.js` exports `k8sTopics` (array), `k8sTopicCategoryMap` (object), `k8sCategories` (array, re-exported from `devopsTopics.js` so categories stay declared in one place).

- [ ] **Step 1: Fetch the source pages**

`WebFetch` each of these and extract: component responsibilities, which component talks to which, version-specific facts (feature gates, GA versions, defaults), and documented failure modes.

```
https://kubernetes.io/docs/concepts/architecture/
https://kubernetes.io/docs/concepts/overview/components/
https://kubernetes.io/docs/concepts/architecture/nodes/
https://kubernetes.io/docs/concepts/architecture/control-plane-node-communication/
https://kubernetes.io/docs/concepts/architecture/controller/
```

Record every URL — they become `references`. Do not write version numbers from memory; take them from the fetched pages.

- [ ] **Step 2: Write the failing test**

Append to `apps/camora/src/data/capra/topics/catalog-integrity.test.ts`:

```ts
describe('k8s topic modules', () => {
  it('merges the barrel into the devops bundle', async () => {
    const barrel = await import('./k8sTopics.js');
    expect(Array.isArray(barrel.k8sTopics)).toBe(true);
    expect(barrel.k8sTopics.length).toBeGreaterThan(0);
    for (const t of barrel.k8sTopics) {
      expect(barrel.k8sTopicCategoryMap[t.id]).toBeDefined();
    }
  });

  it('has moved kubernetes-architecture out of devopsTopics.js', async () => {
    const mod = await import('./devopsTopics.js');
    const stillThere = mod.devopsTopics.some((t) => t.id === 'kubernetes-architecture');
    expect(stillThere).toBe(false);
    const barrel = await import('./k8sTopics.js');
    expect(barrel.k8sTopics.some((t) => t.id === 'kubernetes-architecture')).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/camora && npx vitest run src/data/capra/topics/catalog-integrity.test.ts`

Expected: FAIL — `Cannot find module './k8sTopics.js'`.

- [ ] **Step 4: Create the architecture topic file**

Create `apps/camora/src/data/capra/topics/k8sArchitectureTopics.js`. Fill `content` from the Step 1 fetch — the structure below is exact, the prose is yours:

```js
// Kubernetes — Architecture & the API.
// Sourced from kubernetes.io/docs/concepts/architecture/ and
// /docs/concepts/overview/components/ (CC BY 4.0, paraphrased).
// Category wiring: 'k8s-architecture' in devopsCategories.

export const k8sArchitectureTopics = [
  {
    id: 'kubernetes-architecture',
    title: 'Kubernetes Architecture',
    icon: 'gitBranch',
    color: '#14b8a6',
    questions: 6,
    description:
      'How a cluster is wired: a control plane (kube-apiserver, etcd, scheduler, controller-manager, cloud-controller-manager) coordinating worker nodes (kubelet, kube-proxy, container runtime) through the CRI, CNI and CSI plugin interfaces.',
    introduction:
      '…2–4 paragraphs framing the reconciliation loop: clients write desired state to the apiserver, it persists to etcd and emits watch events, controllers and the scheduler observe and write back. Say why this shape matters in an interview — it is the answer underneath most "how does X work" questions…',
    topics: [
      {
        title: 'Control plane components',
        content: '…kube-apiserver as the only component that talks to etcd; etcd Raft quorum and why 3 or 5 nodes; kube-scheduler filter/score; kube-controller-manager as ~30 leader-elected controllers; cloud-controller-manager…',
        image: '/diagrams/devops/g1-k8s-arch.png',
      },
      {
        title: 'Node components and the CRI / CNI / CSI plugin model',
        content: '…kubelet as node agent and its Node lease; kube-proxy iptables vs IPVS vs nftables and the Cilium eBPF replacement; containerd and CRI-O after dockershim removal; what each of the three plugin interfaces owns…',
      },
      {
        title: 'Control plane ↔ node communication',
        content: '…the hub-and-spoke API pattern, which direction each connection is opened, apiserver-to-kubelet risks, konnectivity…',
      },
      {
        title: 'HA topologies and managed vs self-managed',
        content: '…stacked versus external etcd; apiserver replicas behind a load balancer; EKS/GKE/AKS versus kubeadm, K3s, K0s…',
      },
    ],
    quickFire: [
      { q: 'What is the only component that talks to etcd?', a: 'kube-apiserver. Every other control-plane and node component goes through the API.' },
      { q: 'Why 3 or 5 etcd nodes, never 4?', a: 'Raft quorum is floor(N/2)+1, so 3 tolerates 1 failure and 5 tolerates 2 — while 4 also tolerates only 1. The extra node adds write latency and no availability.' },
      // …at least 3 more, drawn from the fetched pages…
    ],
    references: [
      'https://kubernetes.io/docs/concepts/architecture/',
      'https://kubernetes.io/docs/concepts/overview/components/',
      'https://kubernetes.io/docs/concepts/architecture/nodes/',
      'https://kubernetes.io/docs/concepts/architecture/control-plane-node-communication/',
      'https://kubernetes.io/docs/concepts/architecture/controller/',
    ],
  },
];

export const k8sArchitectureTopicCategoryMap = {
  'kubernetes-architecture': 'k8s-architecture',
};
```

Preserve `/diagrams/devops/g1-k8s-arch.png` — it exists and is referenced by the current stub. Carry across any prose worth keeping from the stub's `visualizations[].description` rather than discarding it; that text is good, it was just in a field that renders as a caption.

- [ ] **Step 5: Create the barrel**

Create `apps/camora/src/data/capra/topics/k8sTopics.js`:

```js
// Barrel for the Kubernetes topic modules. loader.js imports only this.
// Each per-category file exports <name>Topics and <name>TopicCategoryMap;
// add new ones to both spreads below.
//
// Categories themselves stay declared in devopsTopics.js so there is one
// source of truth for what the DevOps page renders.
import { devopsCategories } from './devopsTopics.js';
import { k8sArchitectureTopics, k8sArchitectureTopicCategoryMap } from './k8sArchitectureTopics.js';

export const k8sTopics = [
  ...k8sArchitectureTopics,
];

export const k8sTopicCategoryMap = {
  ...k8sArchitectureTopicCategoryMap,
};

export const k8sCategories = devopsCategories.filter((c) => c.id.startsWith('k8s-'));
```

- [ ] **Step 6: Remove the old topic object and map entry**

In `devopsTopics.js`, delete the entire `kubernetes-architecture` object from the `devopsTopics` array (it starts at `id: 'kubernetes-architecture'`, around line 21503, and runs to its closing `},`), and delete its `devopsTopicCategoryMap` line added in Task 2:

```js
  'kubernetes-architecture':        'k8s-architecture',
```

- [ ] **Step 7: Wire the barrel into the loader**

In `apps/camora/src/data/capra/topics/loader.js`, in the `devops` branch, add the import and merge the results:

```js
  devops: async () => {
    const [mod, helmMod, fluxMod, cpMod, nbMod, extraMod, k8sMod] = await Promise.all([
      import('./devopsTopics.js'),
      import('./helmTopics.js'),
      import('./fluxTopics.js'),
      import('./controlPlaneTopics.js'),
      import('./nativeBuildTopics.js'),
      import('./devopsTopicsExtra.js'),
      import('./k8sTopics.js'),
    ]);
    return {
      devopsCategories: mod.devopsCategories,
      devopsTopicCategoryMap: {
        ...mod.devopsTopicCategoryMap,
        ...extraMod.devopsExtraTopicCategoryMap,
        ...k8sMod.k8sTopicCategoryMap,
      },
      devopsTopics: [
        ...mod.devopsTopics, ...helmMod.helmTopics, ...fluxMod.fluxTopics,
        ...cpMod.controlPlaneTopics, ...nbMod.nativeBuildTopics,
        ...extraMod.devopsExtraTopics, ...k8sMod.k8sTopics,
      ],
    };
  },
```

`devopsCategories` is unchanged — the `k8s-*` categories are declared there already, and `k8sCategories` exists for tests and future use, not for the loader.

- [ ] **Step 8: Update the test helper to match the loader**

In `catalog-integrity.test.ts`, update `loadDevopsBundle()` so it mirrors the new loader — otherwise the Task 1 invariants will report the migrated topic as unrouted:

```ts
async function loadDevopsBundle() {
  const [mod, helm, flux, cp, nb, extra, k8s] = await Promise.all([
    import('./devopsTopics.js'),
    import('./helmTopics.js'),
    import('./fluxTopics.js'),
    import('./controlPlaneTopics.js'),
    import('./nativeBuildTopics.js'),
    import('./devopsTopicsExtra.js'),
    import('./k8sTopics.js'),
  ]);
  return {
    topics: [
      ...mod.devopsTopics, ...helm.helmTopics, ...flux.fluxTopics,
      ...cp.controlPlaneTopics, ...nb.nativeBuildTopics, ...extra.devopsExtraTopics,
      ...k8s.k8sTopics,
    ],
    map: {
      ...mod.devopsTopicCategoryMap,
      ...extra.devopsExtraTopicCategoryMap,
      ...k8s.k8sTopicCategoryMap,
    },
    categoryIds: new Set(mod.devopsCategories.map((c) => c.id)),
    otherPageIds: new Set([
      ...Object.keys(mod.observabilityTopicCategoryMap),
      ...Object.keys(mod.platformTopicCategoryMap),
    ]),
  };
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `cd apps/camora && npx vitest run src/data/capra/topics/catalog-integrity.test.ts`

Expected: 9 passed.

- [ ] **Step 10: Verify the chunk splits and the topic renders**

Run: `cd apps/camora && npx vite build 2>&1 | grep -E "topic-data-k8s|topic-data-devopsTopics"`

Expected: a `topic-data-k8sArchitectureTopics-*.js` chunk exists, and `topic-data-devopsTopics-*.js` has shrunk. Then `pnpm dev:camora`, open the Kubernetes — Architecture & the API category, and confirm the topic shows Overview, Deep Dive sections, and Quick-Fire Q&A.

- [ ] **Step 11: Commit**

```bash
git add apps/camora/src/data/capra/topics/
git commit -m "feat(capra): rewrite kubernetes-architecture and add the k8s module barrel

The entry point to the whole subject was a stub — 10KB of diagram captions,
no overview, no deep dive, no quick-fire. Rewritten to the full shape from
kubernetes.io, with the source URLs recorded so it can be refreshed rather
than re-researched.

Content moves into its own module instead of growing devopsTopics.js, which
is already 2.5MB and ships as one chunk. Vite's manualChunks rule gives every
file under topics/ its own chunk, so each category now caches independently.
The barrel keeps loader.js to a single k8s import as more files land."
```

---

### Task 4: Depth floor for migrated Kubernetes topics

Turns "too high level" from a judgment call into a build failure. Scoped to topics in the barrel, so it holds for everything already migrated and grows automatically as Tasks 5–9 land — no big-bang cutover.

**Files:**
- Modify: `apps/camora/src/data/capra/topics/catalog-integrity.test.ts`

**Interfaces:**
- Consumes: `k8sTopics` from the Task 3 barrel.
- Produces: the depth floor every later task must satisfy.

- [ ] **Step 1: Write the failing test**

Append to `catalog-integrity.test.ts`:

```ts
describe('k8s topic depth floor', () => {
  it('gives every migrated topic an introduction', async () => {
    const { k8sTopics } = await import('./k8sTopics.js');
    const thin = k8sTopics.filter((t) => !t.introduction || t.introduction.length < 200);
    expect(thin.map((t) => t.id)).toEqual([]);
  });

  it('gives every migrated topic at least three deep-dive sections', async () => {
    const { k8sTopics } = await import('./k8sTopics.js');
    const thin = k8sTopics.filter((t) => !t.topics || t.topics.length < 3);
    expect(thin.map((t) => t.id)).toEqual([]);
  });

  it('gives every migrated topic at least five quick-fire pairs', async () => {
    const { k8sTopics } = await import('./k8sTopics.js');
    const thin = k8sTopics.filter((t) => !t.quickFire || t.quickFire.length < 5);
    expect(thin.map((t) => t.id)).toEqual([]);
  });

  it('cites at least one kubernetes.io source per topic', async () => {
    const { k8sTopics } = await import('./k8sTopics.js');
    const uncited = k8sTopics.filter(
      (t) => !(t.references || []).some((r) => r.startsWith('https://kubernetes.io/')),
    );
    expect(uncited.map((t) => t.id)).toEqual([]);
  });

  it('fills every deep-dive section with content', async () => {
    const { k8sTopics } = await import('./k8sTopics.js');
    const empty = [];
    for (const t of k8sTopics) {
      for (const s of t.topics || []) {
        if (!s.title || !s.content || s.content.length < 300) empty.push(`${t.id}/${s.title}`);
      }
    }
    expect(empty).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd apps/camora && npx vitest run src/data/capra/topics/catalog-integrity.test.ts`

Expected: all 14 PASS, because Task 3 wrote `kubernetes-architecture` to the full shape. If any fail, Task 3's topic is under-written — fix the content, not the threshold.

- [ ] **Step 3: Commit**

```bash
git add apps/camora/src/data/capra/topics/catalog-integrity.test.ts
git commit -m "test(capra): enforce a depth floor on migrated kubernetes topics

Three schemas coexist in this catalog and the renderer tolerates all of them,
so a stub looks fine until someone measures it. The floor — overview, three
filled deep-dive sections, five quick-fire pairs, one kubernetes.io source —
makes that measurable at build time.

Scoped to the barrel rather than to every k8s-* category, so it holds for what
has migrated and tightens on its own as the remaining files land."
```

---

### Task 5: Finish the architecture module

**Files:**
- Modify: `apps/camora/src/data/capra/topics/k8sArchitectureTopics.js`
- Modify: `apps/camora/src/data/capra/topics/devopsTopics.js` (remove 2 topic objects + 2 map entries)

**Interfaces:**
- Consumes: the file and map naming from Task 3; the depth floor from Task 4.
- Produces: `k8sArchitectureTopics` grows to 3 topics.

- [ ] **Step 1: Fetch the source pages**

For `kubectl-cli-reference`:
```
https://kubernetes.io/docs/concepts/overview/kubectl/
https://kubernetes.io/docs/reference/kubectl/
https://kubernetes.io/docs/concepts/overview/working-with-objects/object-management/
```

For `local-kubernetes-setup`:
```
https://kubernetes.io/docs/tasks/tools/
https://kubernetes.io/docs/setup/learning-environment/
```

- [ ] **Step 2: Move and rewrite both topics**

For each of `kubectl-cli-reference` and `local-kubernetes-setup`: copy the object out of `devopsTopics.js` into the `k8sArchitectureTopics` array, rewrite to Shape A using the fetched pages (keep any `visualizations` images by moving them onto the matching `topics[]` section as `image`), and add the map entry:

```js
export const k8sArchitectureTopicCategoryMap = {
  'kubernetes-architecture': 'k8s-architecture',
  'kubectl-cli-reference':   'k8s-architecture',
  'local-kubernetes-setup':  'k8s-architecture',
};
```

Then delete both objects from the `devopsTopics` array and both keys from `devopsTopicCategoryMap`.

- [ ] **Step 3: Run the tests to verify they pass**

Run: `cd apps/camora && npx vitest run src/data/capra/topics/catalog-integrity.test.ts`

Expected: 14 passed. A depth-floor failure names the offending topic and section — fill it in.

- [ ] **Step 4: Commit**

```bash
git add apps/camora/src/data/capra/topics/
git commit -m "feat(capra): rewrite kubectl and local-cluster topics into the architecture module

Both were diagram-only stubs. Rewritten from kubernetes.io with sources
recorded, and moved out of devopsTopics.js into their category module."
```

---

### Task 6: Workloads module

**Files:**
- Create: `apps/camora/src/data/capra/topics/k8sWorkloadsTopics.js`
- Modify: `apps/camora/src/data/capra/topics/k8sTopics.js` (add to both spreads)
- Modify: `apps/camora/src/data/capra/topics/devopsTopics.js` (remove 4 topic objects + 4 map entries)

**Interfaces:**
- Consumes: barrel and depth floor.
- Produces: `k8sWorkloadsTopics`, `k8sWorkloadsTopicCategoryMap` — 4 topics, all mapped to `k8s-workloads`.

Topics to migrate: `k8s-core-resources`, `container-probes`, `kubernetes-native-sidecars`, `kubernetes-runtime-class`.

- [ ] **Step 1: Fetch the source pages**

```
# k8s-core-resources — rewrite as the workloads section index
https://kubernetes.io/docs/concepts/workloads/
https://kubernetes.io/docs/concepts/workloads/controllers/
https://kubernetes.io/docs/concepts/workloads/pods/
# container-probes
https://kubernetes.io/docs/concepts/workloads/pods/probes/
# kubernetes-native-sidecars
https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
# kubernetes-runtime-class
https://kubernetes.io/docs/concepts/containers/runtime-class/
```

- [ ] **Step 2: Create the module**

Create `k8sWorkloadsTopics.js` following the exact structure of `k8sArchitectureTopics.js` from Task 3 — a `k8sWorkloadsTopics` array of Shape A objects and a `k8sWorkloadsTopicCategoryMap` mapping all four ids to `'k8s-workloads'`. Move each object out of `devopsTopics.js` and rewrite it from the fetched pages.

Rewrite `k8s-core-resources` as the section index: what each controller is *for* and when to reach for it (Deployment vs StatefulSet vs DaemonSet vs Job), pointing at the per-controller topics the Phase 3 plan will add. Do not try to cover every controller in depth here.

- [ ] **Step 3: Register the module in the barrel**

In `k8sTopics.js`:

```js
import { k8sWorkloadsTopics, k8sWorkloadsTopicCategoryMap } from './k8sWorkloadsTopics.js';

export const k8sTopics = [
  ...k8sArchitectureTopics,
  ...k8sWorkloadsTopics,
];

export const k8sTopicCategoryMap = {
  ...k8sArchitectureTopicCategoryMap,
  ...k8sWorkloadsTopicCategoryMap,
};
```

- [ ] **Step 4: Remove the originals**

Delete all four objects from the `devopsTopics` array in `devopsTopics.js` and all four keys from `devopsTopicCategoryMap`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd apps/camora && npx vitest run src/data/capra/topics/catalog-integrity.test.ts`

Expected: 14 passed. A duplicate-id failure means an object was copied rather than moved.

- [ ] **Step 6: Commit**

```bash
git add apps/camora/src/data/capra/topics/
git commit -m "feat(capra): rewrite the workloads stubs into their own module

Probes, sidecars and RuntimeClass were diagram-only; k8s-core-resources tried
to cover every controller in 8KB and so covered none of them. It is now a
section index that says what each controller is for, with the per-controller
depth to follow."
```

---

### Task 7: Networking module

**Files:**
- Create: `apps/camora/src/data/capra/topics/k8sNetworkingTopics.js`
- Modify: `apps/camora/src/data/capra/topics/k8sTopics.js`
- Modify: `apps/camora/src/data/capra/topics/devopsTopics.js` (remove 4 topic objects + 4 map entries)

**Interfaces:**
- Consumes: barrel and depth floor.
- Produces: `k8sNetworkingTopics`, `k8sNetworkingTopicCategoryMap` — 4 topics mapped to `k8s-networking`.

Topics to migrate: `kubernetes-services`, `kubernetes-gateway-api`, `ingress-gateway-api`, `service-mesh`.

- [ ] **Step 1: Fetch the source pages**

```
# kubernetes-services
https://kubernetes.io/docs/concepts/services-networking/service/
https://kubernetes.io/docs/concepts/services-networking/service-traffic-policy/
# kubernetes-gateway-api
https://kubernetes.io/docs/concepts/services-networking/gateway/
# ingress-gateway-api
https://kubernetes.io/docs/concepts/services-networking/ingress/
https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/
# service-mesh — kubernetes.io has no service-mesh concept page; use the
# cluster networking page for the substrate and cite istio.io / linkerd.io
# for mesh specifics, keeping at least one kubernetes.io reference.
https://kubernetes.io/docs/concepts/cluster-administration/networking/
```

`kubernetes-services` and `ingress-gateway-api` overlap: keep Service types and routing in `kubernetes-services`, and Ingress resources plus controller behaviour in `ingress-gateway-api`. Say in each `introduction` where the boundary is.

- [ ] **Step 2: Create the module**

Create `k8sNetworkingTopics.js` following the Task 3 structure exactly. Move each object out of `devopsTopics.js`, rewrite from the fetched pages, and map all four ids to `'k8s-networking'`. Preserve the six `visualizations` images currently on `ingress-gateway-api` by moving each onto the matching `topics[]` section as `image`.

- [ ] **Step 3: Register the module in the barrel**

```js
import { k8sNetworkingTopics, k8sNetworkingTopicCategoryMap } from './k8sNetworkingTopics.js';
```

Add `...k8sNetworkingTopics` to `k8sTopics` and `...k8sNetworkingTopicCategoryMap` to `k8sTopicCategoryMap`.

- [ ] **Step 4: Remove the originals**

Delete all four objects and their four map keys from `devopsTopics.js`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd apps/camora && npx vitest run src/data/capra/topics/catalog-integrity.test.ts`

Expected: 14 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/camora/src/data/capra/topics/
git commit -m "feat(capra): rewrite the networking stubs into their own module

Services and Ingress each had a stub and they overlapped, so neither said
where its subject ended. The boundary is now stated in both: Service types
and routing in one, Ingress resources and controller behaviour in the other."
```

---

### Task 8: Scheduling module

**Files:**
- Create: `apps/camora/src/data/capra/topics/k8sSchedulingTopics.js`
- Modify: `apps/camora/src/data/capra/topics/k8sTopics.js`
- Modify: `apps/camora/src/data/capra/topics/devopsTopics.js` (remove 4 topic objects + 4 map entries)

**Interfaces:**
- Consumes: barrel and depth floor.
- Produces: `k8sSchedulingTopics`, `k8sSchedulingTopicCategoryMap` — 4 topics mapped to `k8s-scheduling`.

Topics to migrate: `kubernetes-custom-schedulers`, `kubernetes-descheduler`, `kubernetes-evictions`, `kubernetes-gpu-ai-scheduling`.

- [ ] **Step 1: Fetch the source pages**

```
# kubernetes-custom-schedulers
https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/
https://kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/
# kubernetes-descheduler
https://kubernetes.io/docs/concepts/scheduling-eviction/
# kubernetes-evictions
https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/
https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
# kubernetes-gpu-ai-scheduling
https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/
https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
```

Dynamic Resource Allocation and gang scheduling have moved recently — take status and feature-gate names from the fetched page, not from memory.

- [ ] **Step 2: Create the module**

Create `k8sSchedulingTopics.js` following the Task 3 structure exactly. Move each object out of `devopsTopics.js`, rewrite from the fetched pages, and map all four ids to `'k8s-scheduling'`.

- [ ] **Step 3: Register the module in the barrel**

```js
import { k8sSchedulingTopics, k8sSchedulingTopicCategoryMap } from './k8sSchedulingTopics.js';
```

Add `...k8sSchedulingTopics` to `k8sTopics` and `...k8sSchedulingTopicCategoryMap` to `k8sTopicCategoryMap`.

- [ ] **Step 4: Remove the originals**

Delete all four objects and their four map keys from `devopsTopics.js`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd apps/camora && npx vitest run src/data/capra/topics/catalog-integrity.test.ts`

Expected: 14 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/camora/src/data/capra/topics/
git commit -m "feat(capra): rewrite the scheduling stubs into their own module

Custom schedulers, the descheduler, evictions and GPU scheduling were all
diagram-only. Rewritten from kubernetes.io, with DRA and device-plugin status
taken from the live docs rather than assumed — this area has moved."
```

---

### Task 9: Extending, cluster-admin and bare-metal modules

Three small modules in one task: each is a file with one or two topics, and none is worth its own review gate.

**Files:**
- Create: `apps/camora/src/data/capra/topics/k8sExtendingTopics.js`
- Create: `apps/camora/src/data/capra/topics/k8sClusterAdminTopics.js`
- Create: `apps/camora/src/data/capra/topics/k8sBareMetalTopics.js`
- Modify: `apps/camora/src/data/capra/topics/k8sTopics.js`
- Modify: `apps/camora/src/data/capra/topics/devopsTopics.js` (remove 4 topic objects + 4 map entries)

**Interfaces:**
- Consumes: barrel and depth floor.
- Produces: `k8sExtendingTopics` (2), `k8sClusterAdminTopics` (1), `k8sBareMetalTopics` (1) with their matching `*TopicCategoryMap` exports. After this task the barrel holds 19 topics and every Shape-C stub in a Kubernetes category is gone.

Topics to migrate: `operators-and-crds` and `kubernetes-api-aggregation` → `k8sExtendingTopics.js`; `kubernetes-app-troubleshooting` → `k8sClusterAdminTopics.js`; `kubeadm-provisioning` → `k8sBareMetalTopics.js`.

- [ ] **Step 1: Fetch the source pages**

```
# operators-and-crds
https://kubernetes.io/docs/concepts/extend-kubernetes/operator/
https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/
# kubernetes-api-aggregation
https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/apiserver-aggregation/
# kubernetes-app-troubleshooting
https://kubernetes.io/docs/tasks/debug/debug-application/
https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/
# kubeadm-provisioning
https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/
```

- [ ] **Step 2: Create the three modules**

Each follows the Task 3 structure exactly. Map ids to their categories:

```js
// k8sExtendingTopics.js
export const k8sExtendingTopicCategoryMap = {
  'operators-and-crds':         'k8s-extending',
  'kubernetes-api-aggregation': 'k8s-extending',
};

// k8sClusterAdminTopics.js
export const k8sClusterAdminTopicCategoryMap = {
  'kubernetes-app-troubleshooting': 'k8s-cluster-admin',
};

// k8sBareMetalTopics.js
export const k8sBareMetalTopicCategoryMap = {
  'kubeadm-provisioning': 'k8s-baremetal',
};
```

Move each object out of `devopsTopics.js` and rewrite from the fetched pages. `kubeadm-provisioning` has four `visualizations` images — move each onto the matching `topics[]` section as `image`.

- [ ] **Step 3: Register all three in the barrel**

```js
import { k8sExtendingTopics, k8sExtendingTopicCategoryMap } from './k8sExtendingTopics.js';
import { k8sClusterAdminTopics, k8sClusterAdminTopicCategoryMap } from './k8sClusterAdminTopics.js';
import { k8sBareMetalTopics, k8sBareMetalTopicCategoryMap } from './k8sBareMetalTopics.js';
```

Add all three arrays to `k8sTopics` and all three maps to `k8sTopicCategoryMap`.

- [ ] **Step 4: Remove the originals**

Delete all four objects and their four map keys from `devopsTopics.js`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd apps/camora && npx vitest run src/data/capra/topics/catalog-integrity.test.ts`

Expected: 14 passed, with the barrel now holding 19 topics.

- [ ] **Step 6: Verify the whole page and measure the chunks**

Run: `cd apps/camora && npx vite build 2>&1 | grep -E "topic-data-(k8s|devopsTopics)"`

Record the size of `topic-data-devopsTopics-*.js` — it should have dropped by roughly 200 KB — and the total across the seven `topic-data-k8s*` chunks. The spec's decision point is whether the merged k8s bundle exceeds 1 MB; note the number in the commit message for the Phase 3 plan to act on.

Then `pnpm dev:camora`, open `/capra/prepare?page=devops`, and walk all ten Kubernetes categories confirming every topic opens with Overview, Deep Dive and Quick-Fire.

- [ ] **Step 7: Commit**

```bash
git add apps/camora/src/data/capra/topics/
git commit -m "feat(capra): rewrite the last kubernetes stubs into per-category modules

Operators/CRDs, API aggregation, app troubleshooting and kubeadm were the
remaining diagram-only topics in a Kubernetes category. With these moved,
every k8s topic meets the depth floor and devopsTopics.js is ~200KB lighter.

Phases 3-8 add the 89 new topics; the pipeline they follow is the one these
nineteen rewrites just exercised."
```

---

## What this plan does not do

Per the spec, the following remain for the Phase 3–8 content plans, one per category:

- 89 new topics covering the kubernetes.io Concepts tree and the bare-metal portion of `/docs/setup/`.
- `k8sStorageTopics.js`, `k8sConfigPolicyTopics.js`, `k8sSecurityTopics.js` — no stubs migrate into them, so they are created by their content plans.
- Deepening the 12 Shape-A topics and 2 Shape-B topics that already meet the floor but are thinner than their subject deserves (`kubernetes-storage` and `kubernetes-pod-scheduling` are Shape B and will need conversion when their categories are authored).
- The bundle-size decision point, which needs the Task 9 measurement as input.
