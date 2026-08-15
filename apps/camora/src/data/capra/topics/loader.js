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
    const [base, extra, quickRef] = await Promise.all([
      import('./codingTopics.js'),
      import('./codingTopicsExtra.js'),
      import('./quickRefTopics.js'),
    ]);
    return {
      // Quick References lead: they're syntax lookup you consult *while*
      // working a pattern, so they sit above the pattern categories.
      codingCategories: [quickRef.quickRefCategory, ...base.codingCategories],
      codingCategoryMap: {
        ...quickRef.quickRefCategoryMap,
        ...base.codingCategoryMap,
        ...extra.extraCodingCategoryMap,
      },
      // Category headers in the DSA grid render on transition, so topics of
      // one category must stay contiguous in this array.
      codingTopics: [...quickRef.quickRefTopics, ...base.codingTopics, ...extra.extraCodingTopics],
    };
  },

  'system-design': async () => {
    const [topics, problems, problemsExtra, ai1, ai2, ai3, realtime, aiSolves, ecommerce, aiDb, extra] = await Promise.all([
      import('./systemDesignTopics.js'),
      import('./systemDesignProblems.js'),
      import('./systemDesignProblemsExtra.js'),
      import('./systemDesignAIProblems1.js'),
      import('./systemDesignAIProblems2.js'),
      import('./systemDesignAIProblems3.js'),
      import('./systemDesignRealtimeProblems.js'),
      import('./systemDesignAISolvesProblems.js'),
      import('./systemDesignEcommerceProblems.js'),
      import('./systemDesignAIDatabaseProblems.js'),
      import('./systemDesignTopicsExtra.js'),
    ]);

    const allNewCategories = [
      ...problemsExtra.extraSystemDesignProblemCategories,
      ...ai1.aiProblems1Categories,
      ...ai2.aiProblems2Categories,
      ...ai3.aiProblems3Categories,
      ...realtime.realtimeProblemCategories,
      ...aiSolves.aiSolvesProblemCategories,
      ...ecommerce.ecommerceProblemCategories,
      ...aiDb.aiDatabaseProblemCategories,
    ];

    const seenIds = new Set(problems.systemDesignProblemCategories.map((c) => c.id));
    const deduped = allNewCategories.filter((c) => {
      if (seenIds.has(c.id)) return false;
      seenIds.add(c.id);
      return true;
    });

    return {
      systemDesignTopics: topics.systemDesignTopics,
      systemDesignExtraTopics: extra.systemDesignExtraTopics,
      systemDesignExtraCategories: extra.systemDesignExtraCategories,
      systemDesignExtraCategoryMap: extra.systemDesignExtraCategoryMap,
      systemDesignProblemCategories: [
        ...problems.systemDesignProblemCategories,
        ...deduped,
      ],
      systemDesignProblemCategoryMap: {
        ...problems.systemDesignProblemCategoryMap,
        ...problemsExtra.extraSystemDesignProblemCategoryMap,
        ...ai1.aiProblems1CategoryMap,
        ...ai2.aiProblems2CategoryMap,
        ...ai3.aiProblems3CategoryMap,
        ...realtime.realtimeProblemCategoryMap,
        ...aiSolves.aiSolvesProblemCategoryMap,
        ...ecommerce.ecommerceProblemCategoryMap,
        ...aiDb.aiDatabaseProblemCategoryMap,
      },
      systemDesigns: [
        ...problems.systemDesigns,
        ...problemsExtra.extraSystemDesigns,
        ...ai1.aiProblems1Designs,
        ...ai2.aiProblems2Designs,
        ...ai3.aiProblems3Designs,
        ...realtime.realtimeDesigns,
        ...aiSolves.aiSolvesDesigns,
        ...ecommerce.ecommerceDesigns,
        ...aiDb.aiDatabaseDesigns,
      ],
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

  // Site Reliability Engineering — primary-source-grounded interview prep.
  // Lives at /capra/prepare?page=sre. Topics mapped via sreTopicCategoryMap;
  // diagrams at /diagrams/sre/*.png generated by gen-sre-diagrams.py.
  sre: async () => {
    const mod = await import('./sreTopics.js');
    return {
      sreCategories: mod.sreCategories,
      sreTopicCategoryMap: mod.sreTopicCategoryMap,
      sreTopics: mod.sreTopics,
    };
  },

  // DevOps — interview prep grounded in primary sources (Phoenix Project, DevOps
  // Handbook, Accelerate, Continuous Delivery, Team Topologies, IaC Morris,
  // CNCF Platform Whitepaper, SLSA, Sigstore). 11 sub-categories, ~56 topics.
  // Diagrams at /diagrams/devops/*.png from gen-devops-diagrams.py.
  devops: async () => {
    const [mod, helmMod, fluxMod, cpMod, nbMod, extraMod] = await Promise.all([
      import('./devopsTopics.js'),
      import('./helmTopics.js'),
      import('./fluxTopics.js'),
      import('./controlPlaneTopics.js'),
      import('./nativeBuildTopics.js'),
      import('./devopsTopicsExtra.js'),
    ]);
    return {
      devopsCategories: mod.devopsCategories,
      devopsTopicCategoryMap: { ...mod.devopsTopicCategoryMap, ...extraMod.devopsExtraTopicCategoryMap },
      devopsTopics: [
        ...mod.devopsTopics, ...helmMod.helmTopics, ...fluxMod.fluxTopics,
        ...cpMod.controlPlaneTopics, ...nbMod.nativeBuildTopics,
        ...extraMod.devopsExtraTopics,
      ],
    };
  },

  // Coding Challenges — DevOps challenges now, with AIOps/MLOps/IaC sub-categories coming.
  // Lives at /capra/prepare?page=challenges.
  challenges: async () => {
    const [mod, challengeData] = await Promise.all([
      import('./challengesTopics.js'),
      import('./devopsChallengesData.js'),
    ]);
    return {
      challengesCategories: mod.challengesCategories,
      challengesTopicCategoryMap: mod.challengesTopicCategoryMap,
      challengesTopics: mod.challengesTopics,
      devopsChallenges: challengeData.devopsChallenges,
    };
  },

  // Observability & Telemetry — promoted from DevOps sub-category.
  observability: async () => {
    const mod = await import('./devopsTopics.js');
    return {
      observabilityCategories: mod.observabilityCategories,
      observabilityTopicCategoryMap: mod.observabilityTopicCategoryMap,
      observabilityTopics: mod.observabilityTopics,
    };
  },

  // Platform Engineering — promoted from DevOps sub-category.
  platform: async () => {
    const mod = await import('./devopsTopics.js');
    return {
      platformCategories: mod.platformCategories,
      platformTopicCategoryMap: mod.platformTopicCategoryMap,
      platformTopics: mod.platformTopics,
    };
  },

  // DDIA — Designing Data-Intensive Applications (Martin Kleppmann) interview prep.
  // 11 sub-categories, 44 topics. Lives at /capra/prepare?page=ddia.
  ddia: async () => {
    const mod = await import('./ddiaTopics.js');
    return {
      ddiaCategories: mod.ddiaCategories,
      ddiaTopicCategoryMap: mod.ddiaTopicCategoryMap,
      ddiaTopics: mod.ddiaTopics,
    };
  },

  // MLOps & LLMOps — ML lifecycle, feature stores, model serving, LLM ops.
  // Lives at /capra/prepare?page=mlops.
  mlops: async () => {
    const mod = await import('./mlopsTopics.js');
    return {
      mlopsCategories: mod.mlopsCategories,
      mlopsTopicCategoryMap: mod.mlopsTopicCategoryMap,
      mlopsTopics: mod.mlopsTopics,
    };
  },

  // AI Systems Performance Engineering — GPU hardware, CUDA, distributed training,
  // LLM inference optimization. Grounded in "AI Systems Performance" by Chris Fregly
  // (O'Reilly, Nov 2025). Lives at /capra/prepare?page=ai-systems-perf.
  'ai-systems-perf': async () => {
    const mod = await import('./aiSystemsPerfTopics.js');
    return {
      aiSystemsPerfCategories: mod.aiSystemsPerfCategories,
      aiSystemsPerfTopicCategoryMap: mod.aiSystemsPerfTopicCategoryMap,
      aiSystemsPerfTopics: mod.aiSystemsPerfTopics,
    };
  },

  // AIOps — ML-driven ops: anomaly detection, alert correlation, RCA, capacity.
  // Lives at /capra/prepare?page=aiops.
  aiops: async () => {
    const mod = await import('./aiopsTopics.js');
    return {
      aiopsCategories: mod.aiopsCategories,
      aiopsTopicCategoryMap: mod.aiopsTopicCategoryMap,
      aiopsTopics: mod.aiopsTopics,
    };
  },

  // Agentic AI — autonomous agents, multi-agent systems, tool use, memory, orchestration.
  // Lives at /capra/prepare?page=agentic.
  agentic: async () => {
    const mod = await import('./agenticTopics.js');
    return {
      agenticCategories: mod.agenticCategories,
      agenticTopicCategoryMap: mod.agenticTopicCategoryMap,
      agenticTopics: mod.agenticTopics,
    };
  },

  // Cloud / AWS — interview prep for cloud engineers.
  // 11 sub-categories: compute, storage, networking, databases, security,
  // serverless, containers, monitoring, AI/ML, devtools, migration.
  cloud: async () => {
    const mod = await import('./cloudTopics.js');
    return {
      cloudCategories: mod.cloudCategories,
      cloudTopicCategoryMap: mod.cloudTopicCategoryMap,
      cloudTopics: mod.cloudTopics,
    };
  },

  // Linux — fundamentals for cloud/DevOps engineers.
  // 7 sub-categories: fundamentals, shell, networking, performance, storage, security, systemd.
  linux: async () => {
    const mod = await import('./linuxTopics.js');
    return {
      linuxCategories: mod.linuxCategories,
      linuxTopicCategoryMap: mod.linuxTopicCategoryMap,
      linuxTopics: mod.linuxTopics,
    };
  },

  // Networking — cloud and DevOps networking deep dive.
  // 7 sub-categories: fundamentals, DNS, load balancing, firewalls, protocols, cloud networking, troubleshooting.
  networking: async () => {
    const mod = await import('./networkingTopics.js');
    return {
      networkingCategories: mod.networkingCategories,
      networkingTopicCategoryMap: mod.networkingTopicCategoryMap,
      networkingTopics: mod.networkingTopics,
    };
  },

  // Troubleshooting — production incident diagnosis.
  // 7 sub-categories: AWS infra, networking, CI/CD, observability, database, performance, Kubernetes.
  troubleshooting: async () => {
    const mod = await import('./troubleshootingTopics.js');
    return {
      troubleshootingCategories: mod.troubleshootingCategories,
      troubleshootingTopicCategoryMap: mod.troubleshootingTopicCategoryMap,
      troubleshootingTopics: mod.troubleshootingTopics,
    };
  },

  // War Stories — real production incident walkthroughs from AceCloudInterviews.
  // 6 sub-categories: availability, data, security, performance, deployment, networking.
  'war-stories': async () => {
    const mod = await import('./warStoriesTopics.js');
    return {
      warStoriesCategories: mod.warStoriesCategories,
      warStoriesTopicCategoryMap: mod.warStoriesTopicCategoryMap,
      warStoriesTopics: mod.warStoriesTopics,
    };
  },

  // Comparisons — "This vs That" decision guides for common interview choices.
  // 7 sub-categories: compute, storage, messaging, CI/CD tools, monitoring, deployment, networking.
  comparisons: async () => {
    const mod = await import('./comparisonTopics.js');
    return {
      comparisonCategories: mod.comparisonCategories,
      comparisonTopicCategoryMap: mod.comparisonTopicCategoryMap,
      comparisonTopics: mod.comparisonTopics,
    };
  },

};

/**
 * In-memory cache so repeat visits to a page don't re-fetch the chunk.
 * Vite already caches the chunk via the browser; this caches the merged
 * shape so we skip the Promise.all on each page change.
 */
const cache = new Map();

export function getCachedTopicsForPage(page) {
  const loader = HEAVY_TOPIC_LOADERS[page];
  if (!loader) return undefined;
  return cache.get(page);
}

export async function loadTopicsForPage(page) {
  const loader = HEAVY_TOPIC_LOADERS[page];
  if (!loader) return {};
  if (cache.has(page)) return cache.get(page);
  const data = await loader();
  cache.set(page, data);
  return data;
}
