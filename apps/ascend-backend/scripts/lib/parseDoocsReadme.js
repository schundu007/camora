// apps/ascend-backend/scripts/lib/parseDoocsReadme.js
//
// Parses a README_EN.md from doocs/leetcode into the shape `coding_problems` stores.
// Source: https://github.com/doocs/leetcode (CC-BY-SA 4.0) — the English READMEs carry
// the verbatim LeetCode statement HTML plus an editorial and reference solutions, which
// is how we populate problems LeetCode's own API withholds (all paid-only questions).

/** Strip HTML tags and decode the entities LeetCode statements actually use. */
export function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<sup>(.*?)<\/sup>/gi, '^$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|pre)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function section(md, startMarker, endMarker) {
  const s = md.indexOf(startMarker);
  if (s === -1) return null;
  const e = md.indexOf(endMarker, s);
  return md.slice(s + startMarker.length, e === -1 ? undefined : e).trim();
}

/** YAML frontmatter — we only need `difficulty` and `tags`. */
function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { difficulty: null, tags: [] };
  const body = m[1];
  const difficulty = body.match(/^difficulty:\s*(.+)$/m)?.[1]?.trim() ?? null;
  // `tags:` is followed by an indented "- Name" list; it ends at the next
  // unindented key. Walking lines is clearer here than one multiline regex.
  const tags = [];
  const lines = body.split('\n');
  const start = lines.findIndex(l => /^tags:\s*$/.test(l));
  if (start !== -1) {
    for (const line of lines.slice(start + 1)) {
      const t = line.match(/^\s+-\s+(.+)$/)?.[1]?.trim();
      if (!t) break;
      tags.push(t);
    }
  }
  return { difficulty, tags };
}

/**
 * `# [362. Design Hit Counter 🔒](https://leetcode.com/problems/design-hit-counter)`
 * The lock emoji marks paid-only questions.
 */
function parseHeading(md) {
  const m = md.match(/^#\s+\[(\d+)\.\s+([^\]]+?)\]\(([^)]+)\)/m);
  if (!m) return null;
  const rawTitle = m[2];
  return {
    lcId: parseInt(m[1], 10),
    title: rawTitle.replace(/\s*🔒\s*$/, '').trim(),
    isPremium: /🔒/.test(rawTitle),
    slug: m[3].replace(/^https?:\/\/leetcode\.com\/problems\//, '').replace(/\/$/, ''),
  };
}

/**
 * Examples live in <pre> blocks. LeetCode uses two layouts:
 *   inline  — "<strong>Input:</strong> nums = [2,7]"   (label and value on one line)
 *   stacked — "<strong>Input</strong>\n[\"HitCounter\"]" (design problems; value on next line)
 * Both are normalised to { input, output, explanation }.
 */
export function parseExamples(html) {
  if (!html) return [];
  const examples = [];
  const preBlocks = [...html.matchAll(/<pre>([\s\S]*?)<\/pre>/gi)].map(m => m[1]);

  for (const block of preBlocks) {
    const text = htmlToText(block);
    // Split on the three labels, keeping which label opened each chunk.
    const parts = text.split(/^\s*(Input|Output|Explanation)\s*:?\s*$|(?:^|\n)\s*(Input|Output|Explanation)\s*:\s*/m);
    const fields = { Input: '', Output: '', Explanation: '' };
    let current = null;
    for (const part of parts) {
      if (part === undefined) continue;
      const label = part.trim();
      if (label === 'Input' || label === 'Output' || label === 'Explanation') {
        current = label;
      } else if (current) {
        fields[current] += (fields[current] ? '\n' : '') + part.trim();
      }
    }
    const input = fields.Input.trim();
    const output = fields.Output.trim();
    if (!input && !output) continue;
    const ex = { input, output };
    const explanation = fields.Explanation.trim();
    if (explanation) ex.explanation = explanation;
    examples.push(ex);
  }
  return examples;
}

/** The <ul> that follows "<strong>Constraints:</strong>", one entry per <li>. */
export function parseConstraints(html) {
  if (!html) return [];
  const idx = html.search(/<strong>\s*Constraints:?\s*<\/strong>/i);
  if (idx === -1) return [];
  const after = html.slice(idx);
  const ul = after.match(/<ul>([\s\S]*?)<\/ul>/i);
  if (!ul) return [];
  return [...ul[1].matchAll(/<li>([\s\S]*?)<\/li>/gi)]
    .map(m => htmlToText(m[1]).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** "<strong>Follow up:</strong> What if …" — kept separate so the UI can label it. */
export function parseFollowUp(html) {
  if (!html) return null;
  const m = html.match(/<strong>\s*Follow[- ]?up:?\s*<\/strong>([\s\S]*?)<\/p>/i);
  return m ? htmlToText(m[1]).trim() || null : null;
}

/**
 * Editorial approaches: "### Solution 1: Binary Search" followed by prose, then
 * per-language fenced code inside <!-- tabs:start --> … <!-- tabs:end -->.
 * Returns [{ title, explanation, code: { python3: '…', java: '…' } }].
 */
export function parseEditorial(md) {
  const solutions = section(md, '## Solutions', '<!-- problem:end -->') ?? '';
  if (!solutions.trim()) return [];

  const LANG_MAP = {
    python3: 'python3', python: 'python3', py: 'python3',
    java: 'java', cpp: 'cpp', 'c++': 'cpp', c: 'c',
    go: 'golang', golang: 'golang', rust: 'rust',
    javascript: 'javascript', js: 'javascript',
    typescript: 'typescript', ts: 'typescript',
    csharp: 'csharp', 'c#': 'csharp', cs: 'csharp',
    php: 'php', swift: 'swift', kotlin: 'kotlin', ruby: 'ruby', scala: 'scala', sql: 'mysql',
  };

  const approaches = [];
  // Each approach starts at a "### Solution N…" heading; the last runs to the end.
  const headings = [...solutions.matchAll(/^###\s+(.+)$/gm)];
  const spans = headings.map((h, i) => ({
    title: h[1].trim(),
    body: solutions.slice(h.index + h[0].length, headings[i + 1]?.index ?? solutions.length),
  }));
  // Some problems have code but no "### Solution" heading at all.
  if (!spans.length) spans.push({ title: 'Solution', body: solutions });

  for (const { title, body } of spans) {
    const code = {};
    for (const m of body.matchAll(/```([a-zA-Z0-9#+]+)\n([\s\S]*?)```/g)) {
      const lang = LANG_MAP[m[1].toLowerCase()];
      if (lang && !code[lang]) code[lang] = m[2].trimEnd();
    }
    // Prose = everything before the first fence / tab marker, minus stray markers.
    const explanation = body
      .split(/<!-- tabs:start -->|```/)[0]
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();
    if (!explanation && !Object.keys(code).length) continue;
    approaches.push({ title, explanation, code });
  }
  return approaches;
}

/**
 * Full parse of one README_EN.md.
 * Returns null when the file has no recognisable problem heading (index pages, etc.).
 */
export function parseDoocsReadme(md) {
  const heading = parseHeading(md);
  if (!heading) return null;

  const { difficulty, tags } = parseFrontmatter(md);
  const description = section(md, '<!-- description:start -->', '<!-- description:end -->') ?? '';

  return {
    lcId: heading.lcId,
    slug: heading.slug,
    title: heading.title,
    isPremium: heading.isPremium,
    difficulty: ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : null,
    topicTags: tags.map(name => ({ name, slug: name.toLowerCase().replace(/\s+/g, '-') })),
    content: description || null,
    examples: parseExamples(description),
    constraints: parseConstraints(description),
    followUp: parseFollowUp(description),
    editorial: parseEditorial(md),
  };
}
