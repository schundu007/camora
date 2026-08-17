import { describe, it, expect } from 'vitest';
import {
  parseDoocsReadme, parseExamples, parseConstraints, parseFollowUp, htmlToText,
} from '../scripts/lib/parseDoocsReadme.js';

// The library showed premium problems as a bare heading because LeetCode's API
// returns content:null for every paid-only question. We rebuild those statements
// from doocs/leetcode README_EN.md files, so this parser is the thing standing
// between the library and another set of empty problem pages.

const HIT_COUNTER = `---
comments: true
difficulty: Medium
edit_url: https://github.com/doocs/leetcode/edit/main/solution/0300-0399/0362.Design%20Hit%20Counter/README_EN.md
tags:
    - Design
    - Queue
    - Array
    - Binary Search
    - Data Stream
---

<!-- problem:start -->

# [362. Design Hit Counter 🔒](https://leetcode.com/problems/design-hit-counter)

## Description

<!-- description:start -->

<p>Design a hit counter which counts the number of hits received in the past <code>5</code> minutes.</p>

<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>

<pre>
<strong>Input</strong>
[&quot;HitCounter&quot;, &quot;hit&quot;]
[[], [1]]
<strong>Output</strong>
[null, null]

<strong>Explanation</strong>
HitCounter hitCounter = new HitCounter();
</pre>

<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>

<ul>
	<li><code>1 &lt;= timestamp &lt;= 2 * 10<sup>9</sup></code></li>
	<li>At most <code>300</code> calls will be made.</li>
</ul>

<p>&nbsp;</p>
<p><strong>Follow up:</strong> What if the number of hits per second could be huge?</p>

<!-- description:end -->

## Solutions

<!-- solution:start -->

### Solution 1: Binary Search

Since \`timestamp\` is monotonically increasing, we can use an array.

<!-- tabs:start -->

#### Python3

\`\`\`python
class HitCounter:
    def __init__(self):
        self.ts = []
\`\`\`

#### Java

\`\`\`java
class HitCounter {
}
\`\`\`

<!-- tabs:end -->

<!-- solution:end -->

<!-- problem:end -->
`;

describe('parseDoocsReadme', () => {
  const parsed = parseDoocsReadme(HIT_COUNTER);

  it('reads the LeetCode number, title and slug from the heading', () => {
    expect(parsed.lcId).toBe(362);
    expect(parsed.title).toBe('Design Hit Counter');
    expect(parsed.slug).toBe('design-hit-counter');
  });

  it('treats the lock emoji as the premium marker', () => {
    expect(parsed.isPremium).toBe(true);
    // …and does not leave it in the stored title.
    expect(parsed.title).not.toMatch(/🔒/);
  });

  // Regression: the original frontmatter regex stopped after the first list item,
  // so every problem imported with exactly one topic tag.
  it('reads every frontmatter tag, not just the first', () => {
    expect(parsed.topicTags.map(t => t.name)).toEqual([
      'Design', 'Queue', 'Array', 'Binary Search', 'Data Stream',
    ]);
    expect(parsed.topicTags[3].slug).toBe('binary-search');
  });

  it('captures the statement HTML', () => {
    expect(parsed.content).toContain('Design a hit counter');
    expect(parsed.difficulty).toBe('Medium');
  });

  it('extracts the editorial with per-language reference code', () => {
    expect(parsed.editorial).toHaveLength(1);
    expect(parsed.editorial[0].title).toBe('Solution 1: Binary Search');
    expect(parsed.editorial[0].explanation).toContain('monotonically increasing');
    expect(Object.keys(parsed.editorial[0].code).sort()).toEqual(['java', 'python3']);
    expect(parsed.editorial[0].code.python3).toContain('class HitCounter');
    // Prose must stop before the fences rather than swallowing the code.
    expect(parsed.editorial[0].explanation).not.toContain('```');
  });

  it('returns null for a file with no problem heading', () => {
    expect(parseDoocsReadme('# Just an index page\n\nsome text')).toBeNull();
  });
});

describe('parseExamples', () => {
  it('handles the stacked layout used by design problems', () => {
    const [ex] = parseExamples(HIT_COUNTER);
    expect(ex.input).toContain('"HitCounter", "hit"');
    expect(ex.output).toBe('[null, null]');
    expect(ex.explanation).toContain('new HitCounter()');
  });

  it('handles the inline "Input: …" layout used by most problems', () => {
    const html = `<pre><strong>Input:</strong> nums = [2,7,11,15], target = 9
<strong>Output:</strong> [0,1]
<strong>Explanation:</strong> nums[0] + nums[1] == 9.
</pre>`;
    expect(parseExamples(html)).toEqual([{
      input: 'nums = [2,7,11,15], target = 9',
      output: '[0,1]',
      explanation: 'nums[0] + nums[1] == 9.',
    }]);
  });

  it('omits explanation when the example has none', () => {
    const html = `<pre><strong>Input:</strong> n = 1
<strong>Output:</strong> 1
</pre>`;
    expect(parseExamples(html)[0]).not.toHaveProperty('explanation');
  });

  // Some statements use <pre> purely to draw a diagram; those are not examples.
  it('ignores pre blocks with no Input/Output labels', () => {
    expect(parseExamples('<pre>3000 = MMM as 1000 (M) + 1000 (M)</pre>')).toEqual([]);
  });

  it('returns an empty list for statements with no examples', () => {
    expect(parseExamples('<p>Write a SQL query.</p>')).toEqual([]);
    expect(parseExamples(null)).toEqual([]);
  });
});

describe('parseConstraints', () => {
  it('reads each list item and flattens sup/entities', () => {
    expect(parseConstraints(HIT_COUNTER)).toEqual([
      '1 <= timestamp <= 2 * 10^9',
      'At most 300 calls will be made.',
    ]);
  });

  it('returns an empty list when there is no constraints block', () => {
    expect(parseConstraints('<p>No constraints here.</p>')).toEqual([]);
  });
});

describe('parseFollowUp', () => {
  it('pulls the follow-up prompt out of the statement', () => {
    expect(parseFollowUp(HIT_COUNTER)).toBe('What if the number of hits per second could be huge?');
  });

  it('returns null when absent', () => {
    expect(parseFollowUp('<p>Nothing to follow.</p>')).toBeNull();
  });
});

describe('htmlToText', () => {
  it('renders superscripts as ^ so constraints stay readable', () => {
    expect(htmlToText('<code>10<sup>9</sup></code>')).toBe('10^9');
  });

  it('decodes the entities LeetCode statements actually use', () => {
    expect(htmlToText('&quot;a&quot; &lt; &amp; &gt; &#39;b&#39;')).toBe('"a" < & > \'b\'');
  });
});
