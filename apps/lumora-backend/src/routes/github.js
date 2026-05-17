/**
 * GitHub repository fetcher — pulls README and key documentation files
 * from a public GitHub repo and returns them as study document content
 * to be stored in the user's prep kit.
 */
import { Router } from 'express';

const router = Router();

const MAX_FILE_BYTES = 200_000;   // 200 KB per file
const MAX_TOTAL_BYTES = 600_000;  // 600 KB total across all files

// Files/paths to fetch in priority order. We stop once MAX_TOTAL_BYTES is hit.
const TARGET_PATHS = [
  'README.md',
  'README.rst',
  'OVERVIEW.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
  'docs/README.md',
  'docs/source/overview.rst',
  'docs/source/overview.md',
  'docs/source/api.md',
  'docs/source/tutorials/index.rst',
  'docs/source/tutorials/index.md',
];

// Also fetch up to this many files from the docs/ root listing.
const MAX_EXTRA_DOCS = 5;

function parseGitHubUrl(url) {
  try {
    const u = new URL(url.trim());
    if (!u.hostname.includes('github.com')) return null;
    const parts = u.pathname.replace(/^\//, '').split('/');
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

async function ghFetch(path) {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Camora-PrepKit/1.0',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchRawContent(owner, repo, filePath, defaultBranch) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${filePath}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Camora-PrepKit/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, MAX_FILE_BYTES);
  } catch {
    return null;
  }
}

router.post('/fetch-repo', async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    return res.status(400).json({ error: 'Not a valid GitHub repository URL' });
  }

  const { owner, repo } = parsed;

  // Get repo metadata (description + default branch)
  const repoMeta = await ghFetch(`repos/${owner}/${repo}`);
  if (!repoMeta) {
    return res.status(404).json({ error: `Repository ${owner}/${repo} not found or is private` });
  }

  const defaultBranch = repoMeta.default_branch || 'main';
  const description = repoMeta.description || '';
  const docs = [];
  let totalBytes = 0;

  // Add a short repo summary as the first doc.
  const summary = [
    `Repository: ${owner}/${repo}`,
    description ? `Description: ${description}` : '',
    `Stars: ${repoMeta.stargazers_count ?? 0}  Language: ${repoMeta.language ?? 'unknown'}`,
    `URL: https://github.com/${owner}/${repo}`,
  ].filter(Boolean).join('\n');
  docs.push({ name: `${repo} — repo summary`, content: summary });
  totalBytes += summary.length;

  // Fetch known target paths in priority order.
  for (const filePath of TARGET_PATHS) {
    if (totalBytes >= MAX_TOTAL_BYTES) break;
    const content = await fetchRawContent(owner, repo, filePath, defaultBranch);
    if (content && content.trim()) {
      docs.push({ name: `${repo}/${filePath}`, content });
      totalBytes += content.length;
    }
  }

  // Discover and fetch extra .md/.rst files from docs/ listing.
  if (totalBytes < MAX_TOTAL_BYTES) {
    const listing = await ghFetch(`repos/${owner}/${repo}/contents/docs`);
    if (Array.isArray(listing)) {
      const mdFiles = listing
        .filter(f => f.type === 'file' && /\.(md|rst|txt)$/i.test(f.name))
        .slice(0, MAX_EXTRA_DOCS);
      for (const f of mdFiles) {
        if (totalBytes >= MAX_TOTAL_BYTES) break;
        const filePath = `docs/${f.name}`;
        if (TARGET_PATHS.includes(filePath)) continue; // already fetched
        const content = await fetchRawContent(owner, repo, filePath, defaultBranch);
        if (content && content.trim()) {
          docs.push({ name: `${repo}/${filePath}`, content });
          totalBytes += content.length;
        }
      }
    }
  }

  console.log(`[github] fetched ${docs.length} docs (${totalBytes} bytes) from ${owner}/${repo}`);
  res.json({ docs, repoName: `${owner}/${repo}`, description });
});

export default router;
