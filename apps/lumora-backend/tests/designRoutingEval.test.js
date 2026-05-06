/**
 * Regression guard for the designKindClassifier.
 *
 * Reads the hand-curated pair set in eval/design-routing-pairs.json
 * and asserts every pair routes to the expected archetype. When this
 * test fails, EITHER the classifier regressed OR the pair set is
 * stale — fix the right one before merging.
 *
 * Adding a misclassification you found in the wild is a one-line
 * change (append to the JSON), and CI will catch any future drift.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyDesignKind } from '../src/services/designKindClassifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAIRS_PATH = path.resolve(__dirname, '../eval/design-routing-pairs.json');
const { pairs } = JSON.parse(readFileSync(PAIRS_PATH, 'utf8'));

describe('design-routing eval set', () => {
  it('parses the eval file and finds at least 30 pairs', () => {
    expect(Array.isArray(pairs)).toBe(true);
    expect(pairs.length).toBeGreaterThanOrEqual(30);
  });

  for (const pair of pairs) {
    const label = pair.hint
      ? `${pair.question}  (hint=${pair.hint})  → ${pair.expected}`
      : `${pair.question}  → ${pair.expected}`;
    it(label, () => {
      const got = classifyDesignKind(pair.question, pair.hint || null);
      expect(got, `${pair.question}: ${pair.why}`).toBe(pair.expected);
    });
  }
});
