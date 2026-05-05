/**
 * Web watchlist — derives crawl URLs from a user's Prep blob and runs
 * the indexer over each. Reuses the existing COMPANY_SOURCES map from
 * companyContext.js so allowlisted companies stay the single source of
 * truth across context-warmup and watchlist-crawl.
 *
 * Emits up to 2 entries per company: eng blog (if present) and product
 * docs (if the optional `docs` field is set in COMPANY_SOURCES).
 */
import { COMPANY_SOURCES } from './companyContext.js';
import { indexWatchlistRoot } from './webIndexer.js';

export function resolveWatchlist(prepData) {
  if (!prepData || typeof prepData !== 'object') return [];
  const company = prepData.activeCompany;
  if (!company) return [];
  const sources = COMPANY_SOURCES[company];
  if (!sources) return [];
  const entries = [];
  if (sources.eng) {
    entries.push({
      url: sources.eng,
      label: `${company} Engineering Blog`,
      source: company,
    });
  }
  if (sources.docs) {
    entries.push({
      url: sources.docs,
      label: `${company} Product Docs`,
      source: company,
    });
  }
  return entries;
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
      const r = await indexWatchlistRoot({
        rootUrl: entry.url,
        label: entry.label,
        source: entry.source,
        maxArticles: 5,
      });
      totalChunks += r.totalChunks || 0;
      totalWritten += r.totalWritten || 0;
      for (const u of r.perUrl) {
        if (u.skipped) failures.push({ url: u.url, error: u.error });
      }
    } catch (err) {
      failures.push({ url: entry.url, error: err.message });
    }
  }
  return { totalChunks, totalWritten, failures, entryCount: entries.length };
}
