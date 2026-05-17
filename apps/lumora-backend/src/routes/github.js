/**
 * GitHub repository fetcher — pulls README and key documentation files
 * from a public GitHub repo and returns them as study document content
 * to be stored in the user's prep kit.
 *
 * Strategy: prefer raw.githubusercontent.com (no rate limit) over the
 * GitHub REST API. The API is only used for the docs/ directory listing
 * and only when a GITHUB_TOKEN env var is set (which raises rate limit
 * from 60 to 5000/hour). Without a token we skip the API listing and
 * rely solely on the fixed TARGET_PATHS list.
 */
import { Router } from 'express';

const router = Router();

const MAX_FILE_BYTES = 200_000;
const MAX_TOTAL_BYTES = 600_000;
const BRANCHES = ['main', 'master'];

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
  'docs/source/setup/installation.rst',
  'docs/source/setup/installation.md',
];

const MAX_EXTRA_DOCS = 4;

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

function ghHeaders() {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Camora-PrepKit/1.0',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchRaw(owner, repo, filePath, branch) {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`,
      { headers: { 'User-Agent': 'Camora-PrepKit/1.0' }, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return null;
    return (await res.text()).slice(0, MAX_FILE_BYTES);
  } catch {
    return null;
  }
}

async function ghApiGet(path) {
  try {
    const res = await fetch(`https://api.github.com/${path}`, {
      headers: ghHeaders(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

router.post('/fetch-repo', async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url is required' });

  const parsed = parseGitHubUrl(url);
  if (!parsed) return res.status(400).json({ error: 'Not a valid GitHub repository URL' });

  const { owner, repo } = parsed;

  // Discover the default branch by trying to fetch README on each candidate.
  let defaultBranch = null;
  for (const branch of BRANCHES) {
    const probe = await fetchRaw(owner, repo, 'README.md', branch);
    if (probe !== null) { defaultBranch = branch; break; }
    // Also try README.rst
    const probe2 = await fetchRaw(owner, repo, 'README.rst', branch);
    if (probe2 !== null) { defaultBranch = branch; break; }
  }
  if (!defaultBranch) {
    return res.status(404).json({ error: `Could not reach ${owner}/${repo} — repo may be private or the URL is incorrect` });
  }

  const docs = [];
  let totalBytes = 0;

  // Try to get repo metadata from API for a summary (optional — skip on rate limit).
  const meta = await ghApiGet(`repos/${owner}/${repo}`);
  if (meta?.description || meta?.stargazers_count != null) {
    const summary = [
      `Repository: ${owner}/${repo}`,
      meta.description ? `Description: ${meta.description}` : '',
      `Stars: ${meta.stargazers_count ?? 0}  Language: ${meta.language ?? 'unknown'}`,
      `URL: https://github.com/${owner}/${repo}`,
    ].filter(Boolean).join('\n');
    docs.push({ name: `${repo} — repo summary`, content: summary });
    totalBytes += summary.length;
  }

  // Fetch known target paths.
  for (const filePath of TARGET_PATHS) {
    if (totalBytes >= MAX_TOTAL_BYTES) break;
    const content = await fetchRaw(owner, repo, filePath, defaultBranch);
    if (content?.trim()) {
      docs.push({ name: `${repo}/${filePath}`, content });
      totalBytes += content.length;
    }
  }

  // If token is set, also list docs/ to find extra .md/.rst files.
  if (process.env.GITHUB_TOKEN && totalBytes < MAX_TOTAL_BYTES) {
    const listing = await ghApiGet(`repos/${owner}/${repo}/contents/docs`);
    if (Array.isArray(listing)) {
      const extras = listing
        .filter(f => f.type === 'file' && /\.(md|rst|txt)$/i.test(f.name))
        .slice(0, MAX_EXTRA_DOCS);
      for (const f of extras) {
        if (totalBytes >= MAX_TOTAL_BYTES) break;
        const fp = `docs/${f.name}`;
        if (TARGET_PATHS.includes(fp)) continue;
        const content = await fetchRaw(owner, repo, fp, defaultBranch);
        if (content?.trim()) {
          docs.push({ name: `${repo}/${fp}`, content });
          totalBytes += content.length;
        }
      }
    }
  }

  console.log(`[github] ${owner}/${repo} branch=${defaultBranch} docs=${docs.length} bytes=${totalBytes}`);
  res.json({ docs, repoName: `${owner}/${repo}`, description: meta?.description || '' });
});

export default router;
