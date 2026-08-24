import { describe, it, expect } from 'vitest';

/**
 * Mirrors the `devops` branch of loader.js exactly. If loader.js changes how
 * it merges, this must change with it — that coupling is the point. The page
 * renders `filteredTopics.filter(t => map[t.id] === category.id)`, so a topic
 * missing from the map renders nowhere and a map entry with no topic renders
 * nothing. Both fail silently; these tests are what make them loud.
 */
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

describe('k8s topic modules', () => {
  it('maps every topic the barrel exports', async () => {
    const barrel = await import('./k8sTopics.js');
    const categoryMap = barrel.k8sTopicCategoryMap as Record<string, string>;
    expect(barrel.k8sTopics.length).toBeGreaterThan(0);
    const unmapped = barrel.k8sTopics
      .filter((t: { id: string }) => !categoryMap[t.id])
      .map((t: { id: string }) => t.id);
    expect(unmapped).toEqual([]);
  });

  it('does not leave a migrated topic behind in devopsTopics.js', async () => {
    const mod = await import('./devopsTopics.js');
    const barrel = await import('./k8sTopics.js');
    const barrelIds = new Set(barrel.k8sTopics.map((t: { id: string }) => t.id));
    const duplicated = mod.devopsTopics
      .filter((t: { id: string }) => barrelIds.has(t.id))
      .map((t: { id: string }) => t.id);
    expect(duplicated).toEqual([]);
  });
});

/**
 * The depth floor. Three schemas coexist in this catalog and the renderer
 * tolerates all of them, so a stub looks fine until measured. Scoped to the
 * barrel rather than to every k8s-* category, so it holds for what has
 * migrated and tightens automatically as the remaining modules land.
 */
describe('k8s topic depth floor', () => {
  const load = () => import('./k8sTopics.js').then((m) => m.k8sTopics as any[]);

  it('gives every migrated topic an introduction', async () => {
    const thin = (await load()).filter((t) => !t.introduction || t.introduction.length < 200);
    expect(thin.map((t) => t.id)).toEqual([]);
  });

  it('gives every migrated topic at least three deep-dive sections', async () => {
    const thin = (await load()).filter((t) => !t.topics || t.topics.length < 3);
    expect(thin.map((t) => t.id)).toEqual([]);
  });

  it('gives every migrated topic at least five quick-fire pairs', async () => {
    const thin = (await load()).filter((t) => !t.quickFire || t.quickFire.length < 5);
    expect(thin.map((t) => t.id)).toEqual([]);
  });

  it('cites at least one kubernetes.io source per topic', async () => {
    const uncited = (await load()).filter(
      (t) => !(t.references || []).some((r: string) => r.startsWith('https://kubernetes.io/')),
    );
    expect(uncited.map((t) => t.id)).toEqual([]);
  });

  it('fills every deep-dive section with content', async () => {
    const empty: string[] = [];
    for (const t of await load()) {
      for (const s of t.topics || []) {
        if (!s.title || !s.content || s.content.length < 300) empty.push(`${t.id}/${s.title}`);
      }
    }
    expect(empty).toEqual([]);
  });

  it('gives every quick-fire pair a question and an answer', async () => {
    const bad: string[] = [];
    for (const t of await load()) {
      (t.quickFire || []).forEach((p: { q?: string; a?: string }, i: number) => {
        if (!p.q || !p.a) bad.push(`${t.id}[${i}]`);
      });
    }
    expect(bad).toEqual([]);
  });
});
