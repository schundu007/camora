import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..', '..');
const app = readFileSync(join(SRC, 'App.tsx'), 'utf8');
const shell = readFileSync(join(__dirname, 'RootShell.tsx'), 'utf8');

/**
 * Page width is decided in exactly one place: RootShell wraps every shelled
 * page in `.app-measure`. Pages that genuinely need the whole viewport opt out
 * via `<ShellRoute fullBleed>`, and that list is pinned here so adding to it is
 * a deliberate, reviewed act rather than a quiet drift back to 54 bespoke
 * widths.
 */
const EXPECTED_FULL_BLEED = [
  '/capra/problems/:slug',
  '/handbook/:id/practice',
  '/handbook/:id/solution',
  '/playground',
  '/problems/:slug',
];

describe('shared page measure', () => {
  it('RootShell applies .app-measure unless the page opts out', () => {
    expect(shell).toContain('fullBleed');
    expect(shell).toMatch(/fullBleed \? children : <div className="app-measure">/);
  });

  it('only the pinned routes bypass the shared measure', () => {
    const found = [...app.matchAll(/<Route path="([^"]+)" element=\{<ShellRoute fullBleed>/g)]
      .map(m => m[1])
      .sort();
    expect(found).toEqual([...EXPECTED_FULL_BLEED].sort());
  });

  it('ShellRoute forwards fullBleed rather than swallowing it', () => {
    expect(app).toMatch(/ShellRoute = \(\{ children, fullBleed[^)]*\}/);
    expect(app).toContain('<RootShell fullBleed={fullBleed}>');
  });
});
