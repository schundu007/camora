import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { statementBody, renderProblemHtml } from './problem-html';

// The problem detail page shows examples, constraints and the follow-up from their
// own structured columns. The stored statement HTML repeats all three, so without
// the cut in statementBody() every problem page renders each section twice.
describe('statementBody', () => {
  const HTML = `<p>Design a hit counter.</p>
<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input</strong>
[1]</pre>
<p><strong>Constraints:</strong></p>
<ul><li>1 &lt;= timestamp</li></ul>`;

  it('keeps the prose and drops everything from the first example on', () => {
    const body = statementBody(HTML);
    expect(body).toContain('Design a hit counter.');
    expect(body).not.toContain('Example 1');
    expect(body).not.toContain('Constraints');
    expect(body).not.toContain('<pre>');
  });

  it('cuts at the constraints when a problem has no examples', () => {
    const body = statementBody('<p>Write a query.</p><p><strong>Constraints:</strong></p><ul><li>n &lt; 10</li></ul>');
    expect(body).toBe('<p>Write a query.</p>');
  });

  it('leaves a statement with neither section untouched', () => {
    expect(statementBody('<p>Just prose.</p>')).toBe('<p>Just prose.</p>');
  });

  it('trims the trailing spacer paragraphs LeetCode leaves behind', () => {
    expect(statementBody('<p>Body.</p><p>&nbsp;</p>')).toBe('<p>Body.</p>');
  });
});

describe('renderProblemHtml', () => {
  it('renders allowlisted structure as real elements', () => {
    const { container } = render(<div>{renderProblemHtml('<p>Return <code>nums</code>.</p><ul><li>one</li></ul>')}</div>);
    expect(container.querySelector('p')).toBeTruthy();
    expect(container.querySelector('code')?.textContent).toBe('nums');
    expect(container.querySelectorAll('li')).toHaveLength(1);
  });

  // The statements are ours, but they are stored HTML rendered into an authenticated
  // page — the allowlist is what keeps a bad row from becoming script execution.
  it('drops script tags and their contents', () => {
    const { container } = render(<div>{renderProblemHtml('<p>ok</p><script>alert(1)</script>')}</div>);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toBe('ok');
  });

  it('unwraps unknown tags but keeps their text', () => {
    const { container } = render(<div>{renderProblemHtml('<marquee>keep me</marquee>')}</div>);
    expect(container.querySelector('marquee')).toBeNull();
    expect(container.textContent).toBe('keep me');
  });

  it('rejects non-http image sources', () => {
    const { container } = render(<div>{renderProblemHtml('<img src="javascript:alert(1)"><img src="https://ex.com/a.png">')}</div>);
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute('src')).toBe('https://ex.com/a.png');
  });

  it('decodes entities so constraints read normally', () => {
    render(<div>{renderProblemHtml('<p>1 &lt;= n &lt;= 10</p>')}</div>);
    expect(screen.getByText('1 <= n <= 10')).toBeTruthy();
  });

  it('returns null for empty input', () => {
    expect(renderProblemHtml(null)).toBeNull();
    expect(renderProblemHtml('')).toBeNull();
  });
});
