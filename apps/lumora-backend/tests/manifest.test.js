/**
 * Smoke test for the topic+problem manifest: every entry must
 *  - point to a file that exists
 *  - export the named symbol with the declared shape (array | object)
 *  - produce at least one chunk via the right chunker (topic vs problem)
 *
 * This catches manifest typos and shape mismatches before any DB work.
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TOPIC_MANIFEST } from '../scripts/topic-manifest.js';
import { chunkTopic } from '../src/services/chunker.js';
import { chunkProblem } from '../src/services/problemChunker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../apps/camora/src/data/capra');
const TOPICS_DIR = path.join(DATA_DIR, 'topics');

function resolveEntryPath(entry) {
  const base = entry.dir === 'data' ? DATA_DIR : TOPICS_DIR;
  return path.join(base, entry.file);
}

async function loadEntry(entry) {
  const abs = resolveEntryPath(entry);
  const url = pathToFileURL(abs).href;
  const mod = await import(url);
  const exp = mod[entry.export];
  if (entry.shape === 'object') {
    return Object.entries(exp).map(([slug, val]) => ({ ...val, slug }));
  }
  return exp;
}

function chunkFor(item, entry) {
  const kind = entry.kind || 'topic';
  if (kind === 'topic') return chunkTopic(item, { source: entry.source });
  if (kind === 'problem-leetcode') return chunkProblem(item, { source: entry.source, kind: 'leetcode' });
  if (kind === 'problem-lld') return chunkProblem(item, { source: entry.source, kind: 'lld' });
  if (kind === 'problem-sd') return chunkProblem(item, { source: entry.source, kind: 'sd' });
  if (kind === 'problem-sql') return chunkProblem(item, { source: entry.source, kind: 'sql' });
  throw new Error(`Unknown kind: ${kind}`);
}

describe('TOPIC_MANIFEST', () => {
  for (const entry of TOPIC_MANIFEST) {
    it(`${entry.source} (${entry.file}) loads and produces chunks`, async () => {
      const items = await loadEntry(entry);
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      // Sanity: chunk the first item with the right chunker.
      const chunks = chunkFor(items[0], entry);
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(0);
      for (const c of chunks) {
        expect(c.source).toBe(entry.source);
        expect(c.topicId).toBeTruthy();
        expect(c.section).toBeTruthy();
        expect(c.content.length).toBeGreaterThan(0);
        expect(c.contentHash).toMatch(/^[a-f0-9]+$/);
      }
    });
  }
});
