// Combined enrichment data for all 9 projects (system-impl + frontend)
// Imported and merged into projectTopics via enrichProjectTopics()

import { enrichment_1_3 } from './projectEnrichment_1_3';
import { enrichment_4_5 } from './projectEnrichment_4_5';
import { enrichment_6_9 } from './projectEnrichment_6_9';

export const projectEnrichmentMap = {
  ...enrichment_1_3,
  ...enrichment_4_5,
  ...enrichment_6_9,
};

/**
 * Merges enrichment fields into the projectTopics array in-place.
 * Call once at module load time after importing projectTopics.
 */
export function enrichProjectTopics(topics) {
  return topics.map(topic => {
    const extra = projectEnrichmentMap[topic.id];
    if (!extra) return topic;
    return { ...topic, ...extra };
  });
}
