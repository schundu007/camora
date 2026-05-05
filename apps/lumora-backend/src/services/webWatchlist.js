/**
 * Web watchlist — derives crawl URLs from a user's Prep blob and runs
 * the indexer over each. v1 reuses the existing COMPANY_SOURCES map
 * from companyContext.js so allowlisted companies stay the single
 * source of truth across context-warmup and watchlist-crawl.
 *
 * Currently emits one URL per company (the eng blog). Future v2 can
 * add the github org or product docs.
 */
import { COMPANY_SOURCES } from './companyContext.js';
import { indexWatchlistUrl } from './webIndexer.js';

export function resolveWatchlist(prepData) {
  if (!prepData || typeof prepData !== 'object') return [];
  const company = prepData.activeCompany;
  if (!company) return [];
  const sources = COMPANY_SOURCES[company];
  if (!sources || !sources.eng) return [];
  return [
    {
      url: sources.eng,
      label: `${company} Engineering Blog`,
      source: company,
    },
  ];
}

export async function buildWebWatchlist({ userId, prepData }) {
  if (!userId || !prepData?.activeCompany) return { skipped: true };
  const entries = resolveWatchlist(prepData);
  if (entries.length === 0) return { skipped: true };

  let totalChunks = 0;
  let totalWritten = 0;
  const failures = [];
  for (const entry of entries) {
    try {
      const r = await indexWatchlistUrl(entry);
      totalChunks += r.chunkCount || 0;
      totalWritten += r.written || 0;
      if (r.skipped) failures.push({ url: entry.url, error: r.error });
    } catch (err) {
      failures.push({ url: entry.url, error: err.message });
    }
  }
  return { totalChunks, totalWritten, failures, entryCount: entries.length };
}
