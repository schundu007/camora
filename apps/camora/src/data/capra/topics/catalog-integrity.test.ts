import { describe, it, expect } from 'vitest';

/**
 * Mirrors the `devops` branch of loader.js exactly. If loader.js changes how
 * it merges, this must change with it — that coupling is the point. The page
 * renders `filteredTopics.filter(t => map[t.id] === category.id)`, so a topic
 * missing from the map renders nowhere and a map entry with no topic renders
 * nothing. Both fail silently; these tests are what make them loud.
 */
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
    categoryIds: new Set(mod.devopsCategories.map((c: { id: string }) => c.id)),
    // devopsTopics.js also feeds the Observability and Platform Engineering
    // pages; topics routed there are legitimately absent from the DevOps map.
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
      .filter((t: { id: string }) => !(t.id in map) && !otherPageIds.has(t.id))
      .map((t: { id: string }) => t.id);
    expect(unrouted).toEqual([]);
  });

  it('points every map entry at a declared category', async () => {
    const { map, categoryIds } = await loadDevopsBundle();
    const bad = Object.entries(map).filter(([, cat]) => !categoryIds.has(cat as string));
    expect(bad).toEqual([]);
  });

  it('has no duplicate topic ids', async () => {
    const { topics } = await loadDevopsBundle();
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const t of topics as { id: string }[]) {
      if (seen.has(t.id)) dups.push(t.id);
      seen.add(t.id);
    }
    expect(dups).toEqual([]);
  });

  it('has no map entry pointing at a topic that does not exist', async () => {
    const { topics, map } = await loadDevopsBundle();
    const ids = new Set((topics as { id: string }[]).map((t) => t.id));
    const dangling = Object.keys(map).filter((id) => !ids.has(id));
    expect(dangling).toEqual([]);
  });
});

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
