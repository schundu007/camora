import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderInlineSafe } from './inline-renderer';

// The behavioral panel renders mid-stream, so the last few characters of every
// answer are a half-written marker. They must never reach the screen as markup.
describe('renderInlineSafe mid-stream', () => {
  const text = (s: string) => render(<div>{renderInlineSafe(s)}</div>).container.textContent || '';

  it('styles a bold run with no closer yet', () => {
    expect(text('I cut latency by **40')).not.toContain('*');
    expect(text('I cut latency by **40')).toContain('40');
  });

  it('shows nothing for a marker with no content yet', () => {
    expect(text('I cut latency by **')).toBe('I cut latency by ');
  });

  it('styles an unclosed code span', () => {
    expect(text('run `kubectl appl')).not.toContain('`');
    expect(text('run `kubectl appl')).toContain('kubectl appl');
  });

  it('leaks no markup at any prefix of a streaming answer', () => {
    const full = 'I owned the **migration** and cut p99 from `900ms` to **120ms**.';
    for (let i = 1; i <= full.length; i++) {
      const out = text(full.slice(0, i));
      expect(out, `prefix ${i}`).not.toContain('**');
      expect(out, `prefix ${i}`).not.toContain('`');
    }
  });
});
