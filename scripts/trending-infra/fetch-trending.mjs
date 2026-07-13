#!/usr/bin/env node
/**
 * fetch-trending.mjs — build a maintained "trending infra projects" list.
 *
 * GitHub has NO official trending API, so "trending" is *computed*: for each
 * category we query the Search API (topic/keyword qualifiers + a star floor +
 * recent-push filter), then rank by a velocity proxy — average stars/month over
 * the repo's lifetime — so fast-growing repos surface above all-time giants.
 *
 * Outputs (deterministic, diff-friendly):
 *   - docs/trending-infra.md   (human-readable tables, one per category)
 *   - data/trending.json       (machine-readable, for programmatic use)
 *
 * Auth: reads GITHUB_TOKEN or GH_TOKEN from the env (required to avoid the low
 * unauthenticated search rate limit). In CI, the default GITHUB_TOKEN works.
 *
 * Run locally:  GITHUB_TOKEN=$(gh auth token) node scripts/trending-infra/fetch-trending.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TOP_N = 10;
const STAR_FLOOR = 300;          // ignore noise below this
const PUSHED_WITHIN_DAYS = 120;  // must be actively maintained

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
if (!TOKEN) {
  console.error('ERROR: set GITHUB_TOKEN or GH_TOKEN (e.g. GITHUB_TOKEN=$(gh auth token)).');
  process.exit(1);
}

// Each category merges the results of several queries, dedupes, then ranks.
const CATEGORIES = [
  { key: 'devops', title: 'DevOps', topics: ['devops', 'gitops', 'infrastructure-as-code'] },
  { key: 'platform-engineering', title: 'Platform Engineering', topics: ['platform-engineering', 'internal-developer-platform', 'backstage'] },
  { key: 'mlops-aiml-pipelines', title: 'MLOps / AIML Pipelines', topics: ['mlops', 'ml-pipeline', 'machine-learning-operations'] },
  { key: 'sre-observability', title: 'SRE / Observability', topics: ['sre', 'observability', 'site-reliability-engineering'] },
  { key: 'ai-platform-llmops', title: 'AI Platform / LLMOps', topics: ['llmops', 'llm-ops', 'ai-infrastructure', 'llm-inference'] },
  { key: 'gpu-infra', title: 'GPU Stack / Infrastructure', topics: ['gpu', 'cuda', 'gpu-computing'] },
];

const isoDay = (d) => d.toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(query) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=40`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'camora-trending-infra',
    },
  });
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers.get('x-ratelimit-reset') || 0) * 1000;
    const waitMs = Math.max(1000, reset - Date.now() + 1000);
    console.error(`  rate limited — waiting ${Math.round(waitMs / 1000)}s`);
    await sleep(Math.min(waitMs, 65000));
    return search(query);
  }
  if (!res.ok) throw new Error(`Search failed ${res.status}: ${await res.text()}`);
  const body = await res.json();
  return body.items || [];
}

function velocityPerMonth(repo) {
  const ageMonths = Math.max(
    1,
    (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30.44),
  );
  return repo.stargazers_count / ageMonths;
}

async function buildCategory(cat, pushedSince) {
  const byName = new Map();
  for (const topic of cat.topics) {
    const q = `topic:${topic} stars:>${STAR_FLOOR} pushed:>${pushedSince} archived:false`;
    const items = await search(q);
    for (const it of items) if (!byName.has(it.full_name)) byName.set(it.full_name, it);
    await sleep(1200); // stay well under the 30 req/min authenticated search limit
  }
  const ranked = [...byName.values()]
    .map((r) => ({ r, v: velocityPerMonth(r) }))
    .sort((a, b) =>
      b.v - a.v ||
      b.r.stargazers_count - a.r.stargazers_count ||
      a.r.full_name.localeCompare(b.r.full_name),
    )
    .slice(0, TOP_N)
    .map(({ r, v }, i) => ({
      rank: i + 1,
      full_name: r.full_name,
      html_url: r.html_url,
      description: (r.description || '').trim(),
      stars: r.stargazers_count,
      velocity_per_month: Math.round(v),
      language: r.language || '',
      topics: (r.topics || []).slice(0, 6),
      pushed_at: r.pushed_at,
      created_at: r.created_at,
    }));
  return { key: cat.key, title: cat.title, queried_topics: cat.topics, repos: ranked };
}

function toMarkdown(data) {
  const lines = [];
  lines.push('# Trending Infrastructure & Platform Projects');
  lines.push('');
  lines.push(`_Auto-generated — last updated **${data.generated_at.slice(0, 10)}**. Do not edit by hand; run \`pnpm trending:refresh\` or let the weekly GitHub Action update it._`);
  lines.push('');
  lines.push(`**How this is ranked:** GitHub has no official trending API, so each category is computed from the GitHub Search API (topic filters, \`stars:>${STAR_FLOOR}\`, pushed within ${PUSHED_WITHIN_DAYS} days, non-archived) and ordered by a **velocity** proxy — average stars gained per month over the repo's lifetime — so fast-growing projects rank above all-time giants. "★/mo" is that velocity.`);
  lines.push('');
  lines.push(`Categories: ${data.categories.map((c) => `[${c.title}](#${c.key})`).join(' · ')}`);
  lines.push('');
  for (const cat of data.categories) {
    lines.push(`## ${cat.title}`);
    lines.push(`<a id="${cat.key}"></a>`);
    lines.push(`_Topics queried: ${cat.queried_topics.map((t) => `\`${t}\``).join(', ')}_`);
    lines.push('');
    if (!cat.repos.length) {
      lines.push('_No results this run._');
      lines.push('');
      continue;
    }
    lines.push('| # | Repository | ★ Stars | ★/mo | Lang | Last push | Description |');
    lines.push('|---|---|--:|--:|---|---|---|');
    for (const r of cat.repos) {
      const desc = r.description.replace(/\|/g, '\\|').slice(0, 100);
      lines.push(
        `| ${r.rank} | [${r.full_name}](${r.html_url}) | ${r.stars.toLocaleString('en-US')} | ${r.velocity_per_month.toLocaleString('en-US')} | ${r.language || '—'} | ${r.pushed_at.slice(0, 10)} | ${desc} |`,
      );
    }
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

async function main() {
  const pushedSince = isoDay(new Date(Date.now() - PUSHED_WITHIN_DAYS * 24 * 60 * 60 * 1000));
  console.error(`Fetching trending infra projects (pushed since ${pushedSince}, star floor ${STAR_FLOOR})…`);
  const categories = [];
  for (const cat of CATEGORIES) {
    console.error(`- ${cat.title}`);
    categories.push(await buildCategory(cat, pushedSince));
  }
  const data = {
    generated_at: new Date().toISOString(),
    methodology: `Computed from GitHub Search API per category (topic filters, stars:>${STAR_FLOOR}, pushed within ${PUSHED_WITHIN_DAYS} days, non-archived), ranked by average stars/month over the repo lifetime.`,
    star_floor: STAR_FLOOR,
    pushed_within_days: PUSHED_WITHIN_DAYS,
    top_n: TOP_N,
    categories,
  };

  const jsonPath = resolve(REPO_ROOT, 'data/trending.json');
  const mdPath = resolve(REPO_ROOT, 'docs/trending-infra.md');
  mkdirSync(dirname(jsonPath), { recursive: true });
  mkdirSync(dirname(mdPath), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
  writeFileSync(mdPath, toMarkdown(data));

  const total = categories.reduce((a, c) => a + c.repos.length, 0);
  console.error(`Wrote ${total} repos across ${categories.length} categories:`);
  console.error(`  - ${mdPath}`);
  console.error(`  - ${jsonPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
