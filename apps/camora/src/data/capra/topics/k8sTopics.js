// Barrel for the Kubernetes topic modules. loader.js imports only this file.
//
// Each per-category module exports <name>Topics and <name>TopicCategoryMap;
// register a new one by adding it to both spreads below. Vite's manualChunks
// rule already emits every file under data/capra/topics/ as its own
// topic-data-* chunk, so each category caches independently with no build
// config — the barrel exists to keep loader.js to a single k8s import.
//
// Categories stay declared in devopsTopics.js so there is one source of truth
// for what the DevOps page renders.
import { devopsCategories } from './devopsTopics.js';
import { k8sArchitectureTopics, k8sArchitectureTopicCategoryMap } from './k8sArchitectureTopics.js';
import { k8sBareMetalTopics, k8sBareMetalTopicCategoryMap } from './k8sBareMetalTopics.js';
import { k8sClusterAdminTopics, k8sClusterAdminTopicCategoryMap } from './k8sClusterAdminTopics.js';

export const k8sTopics = [
  ...k8sArchitectureTopics,
  ...k8sBareMetalTopics,
  ...k8sClusterAdminTopics,
];

export const k8sTopicCategoryMap = {
  ...k8sArchitectureTopicCategoryMap,
  ...k8sBareMetalTopicCategoryMap,
  ...k8sClusterAdminTopicCategoryMap,
};

export const k8sCategories = devopsCategories.filter((c) => c.id.startsWith('k8s-'));
