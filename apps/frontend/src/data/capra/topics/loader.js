/**
 * Per-category dynamic loaders for the heaviest topic data.
 *
 * Statically importing every topic file in DocsPage produced a 7.6 MB chunk.
 * Most user sessions only visit one category, so we split the five heaviest
 * categories (coding ~830 KB, system-design ~4 MB, low-level ~790 KB,
 * behavioral ~280 KB, projects ~360 KB) into their own dynamically-loaded
 * chunks. Vite/Rollup emits each `import('./xxx')` as a standalone JS file
 * that fetches only when the corresponding activePage is opened.
 *
 * Smaller categories (databases, sql, microservices, roadmaps, eng-blogs,
 * concurrency, system-design patterns/tradeoffs/scalable) stay statically
 * imported by DocsPage — they total ~1.1 MB and don't justify the
 * orchestration overhead.
 */

/**
 * Returns a promise that resolves to a partial of the topic-state object.
 * Caller merges into its existing state.
 */
export const HEAVY_TOPIC_LOADERS = {
  coding: async () => {
    const [base, extra] = await Promise.all([
      import('./codingTopics.js'),
      import('./codingTopicsExtra.js'),
    ]);
    return {
      codingCategories: base.codingCategories,
      codingCategoryMap: { ...base.codingCategoryMap, ...extra.extraCodingCategoryMap },
      codingTopics: [...base.codingTopics, ...extra.extraCodingTopics],
    };
  },

  'system-design': async () => {
    const [topics, problems, problemsExtra] = await Promise.all([
      import('./systemDesignTopics.js'),
      import('./systemDesignProblems.js'),
      import('./systemDesignProblemsExtra.js'),
    ]);
    return {
      systemDesignTopics: topics.systemDesignTopics,
      systemDesignProblemCategories: [
        ...problems.systemDesignProblemCategories,
        ...problemsExtra.extraSystemDesignProblemCategories.filter(
          (c) => !problems.systemDesignProblemCategories.some((p) => p.id === c.id)
        ),
      ],
      systemDesignProblemCategoryMap: {
        ...problems.systemDesignProblemCategoryMap,
        ...problemsExtra.extraSystemDesignProblemCategoryMap,
      },
      systemDesigns: [...problems.systemDesigns, ...problemsExtra.extraSystemDesigns],
      lldProblemCategories: problems.lldProblemCategories,
    };
  },

  'low-level': async () => {
    const [topics, problemsBase, problemsExtra] = await Promise.all([
      import('./lldTopics.js'),
      import('./lldProblems.js'),
      import('./lldProblemsExtra.js'),
    ]);
    return {
      lldCategories: topics.lldCategories,
      lldCategoryMap: topics.lldCategoryMap,
      lldTopics: topics.lldTopics,
      lldProblemCategoryMap: { ...problemsBase.lldProblemCategoryMap, ...problemsExtra.extraLldProblemCategoryMap },
      lldProblems: [...problemsBase.lldProblems, ...problemsExtra.extraLldProblems],
    };
  },

  behavioral: async () => {
    const mod = await import('./behavioralTopics.js');
    return {
      behavioralCategories: mod.behavioralCategories,
      topicCategoryMap: mod.topicCategoryMap,
      behavioralTopics: mod.behavioralTopics,
    };
  },

  projects: async () => {
    const mod = await import('./projectTopics.js');
    return {
      projectCategories: mod.projectCategories,
      projectCategoryMap: mod.projectCategoryMap,
      projectTopics: mod.projectTopics,
    };
  },
};

/**
 * In-memory cache so repeat visits to a page don't re-fetch the chunk.
 * Vite already caches the chunk via the browser; this caches the merged
 * shape so we skip the Promise.all on each page change.
 */
const cache = new Map();

export async function loadTopicsForPage(page) {
  const loader = HEAVY_TOPIC_LOADERS[page];
  if (!loader) return {};
  if (cache.has(page)) return cache.get(page);
  const data = await loader();
  cache.set(page, data);
  return data;
}
