#!/usr/bin/env node
/**
 * render-html.mjs — build a standalone, self-contained HTML page from
 * data/trending.json. Openable directly in any browser (file:// or hosted),
 * theme-aware, every repo is a clickable link.
 *
 * Run:  node scripts/trending-infra/render-html.mjs
 * (Called automatically by fetch-trending.mjs after each refresh.)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const JSON_PATH = resolve(REPO_ROOT, 'data/trending.json');
const HTML_PATH = resolve(REPO_ROOT, 'docs/trending-infra.html');

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmt = (n) => Number(n).toLocaleString('en-US');

// Body content only (title + inline style + page markup). Used directly by the
// Artifact publisher (which supplies its own <!doctype>/<html>/<head>/<body>),
// and wrapped by renderHtml() into a full standalone document for the repo file.
export function renderBody(data) {
  const updated = (data.generated_at || '').slice(0, 10);
  const nav = data.categories
    .map((c) => `<a class="navchip" href="#${esc(c.key)}">${esc(c.title)}</a>`)
    .join('');

  const sections = data.categories
    .map((cat) => {
      const rows = cat.repos
        .map((r) => {
          const topics = (r.topics || [])
            .slice(0, 4)
            .map((t) => `<span class="topic">${esc(t)}</span>`)
            .join('');
          return `
          <li class="repo">
            <div class="rank">${r.rank}</div>
            <div class="main">
              <a class="name" href="${esc(r.html_url)}" target="_blank" rel="noopener noreferrer">${esc(r.full_name)}</a>
              <p class="desc">${esc(r.description) || '<span class="muted">No description</span>'}</p>
              <div class="topics">${topics}</div>
            </div>
            <div class="stats">
              <span class="stat stars" title="Total stars">★ ${fmt(r.stars)}</span>
              <span class="stat vel" title="Average stars gained per month (velocity)">${fmt(r.velocity_per_month)}/mo</span>
              <span class="stat lang">${esc(r.language) || '—'}</span>
              <span class="stat push" title="Last pushed">↻ ${esc((r.pushed_at || '').slice(0, 10))}</span>
            </div>
          </li>`;
        })
        .join('');
      return `
      <section id="${esc(cat.key)}" class="category">
        <h2>${esc(cat.title)}</h2>
        <p class="topics-line">Topics: ${cat.queried_topics.map((t) => `<code>${esc(t)}</code>`).join(' ')}</p>
        <ol class="repos">${rows}</ol>
      </section>`;
    })
    .join('');

  return `<style>
  /* Light is the default; dark applies via OS preference AND the viewer's
     explicit data-theme toggle, which must win in both directions. */
  :root {
    --bg:#f6f7f9; --panel:#ffffff; --ink:#0f1720; --muted:#5b6675; --line:#e6e9ee;
    --accent:#0047AB; --accent-soft:#eaf0fb; --gold:#b8860b; --star:#e3a008;
    --shadow:0 1px 3px rgba(16,24,40,.06),0 1px 2px rgba(16,24,40,.04);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg:#0b0f14; --panel:#141a22; --ink:#e8edf3; --muted:#9aa7b6; --line:#232c37;
      --accent:#5b8def; --accent-soft:#16202e; --gold:#d4af37; --star:#f5c451;
      --shadow:0 1px 3px rgba(0,0,0,.4);
    }
  }
  :root[data-theme="light"] {
    --bg:#f6f7f9; --panel:#ffffff; --ink:#0f1720; --muted:#5b6675; --line:#e6e9ee;
    --accent:#0047AB; --accent-soft:#eaf0fb; --gold:#b8860b; --star:#e3a008;
    --shadow:0 1px 3px rgba(16,24,40,.06),0 1px 2px rgba(16,24,40,.04);
  }
  :root[data-theme="dark"] {
    --bg:#0b0f14; --panel:#141a22; --ink:#e8edf3; --muted:#9aa7b6; --line:#232c37;
    --accent:#5b8def; --accent-soft:#16202e; --gold:#d4af37; --star:#f5c451;
    --shadow:0 1px 3px rgba(0,0,0,.4);
  }
  * { box-sizing:border-box; }
  body {
    margin:0; background:var(--bg); color:var(--ink);
    font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  }
  a { color:var(--accent); text-decoration:none; }
  a:hover { text-decoration:underline; }
  .wrap { max-width:960px; margin:0 auto; padding:32px 20px 80px; }
  header h1 { font-size:26px; margin:0 0 6px; letter-spacing:-.02em; }
  .sub { color:var(--muted); margin:0 0 4px; }
  .method { color:var(--muted); font-size:13px; margin:12px 0 0; padding:12px 14px;
    background:var(--panel); border:1px solid var(--line); border-radius:10px; box-shadow:var(--shadow); }
  nav { position:sticky; top:0; z-index:5; margin:20px 0 8px; padding:12px 0;
    background:var(--bg); display:flex; flex-wrap:wrap; gap:8px; border-bottom:1px solid var(--line); }
  .navchip { font-size:12.5px; font-weight:600; padding:6px 11px; border-radius:999px;
    background:var(--accent-soft); color:var(--accent); border:1px solid var(--line); }
  .navchip:hover { text-decoration:none; filter:brightness(.97); }
  .category { margin-top:34px; }
  .category h2 { font-size:19px; margin:0 0 2px; }
  .topics-line { color:var(--muted); font-size:12.5px; margin:0 0 14px; }
  .topics-line code, .method code { background:var(--accent-soft); color:var(--accent);
    padding:1px 6px; border-radius:5px; font-size:12px; }
  ol.repos { list-style:none; margin:0; padding:0; display:grid; gap:10px; }
  .repo { display:grid; grid-template-columns:34px 1fr auto; gap:14px; align-items:start;
    background:var(--panel); border:1px solid var(--line); border-radius:12px;
    padding:14px 16px; box-shadow:var(--shadow); }
  .rank { font-weight:700; font-size:15px; color:var(--muted); text-align:center; padding-top:2px; }
  .main { min-width:0; }
  .name { font-weight:650; font-size:15.5px; word-break:break-word; }
  .desc { margin:4px 0 8px; color:var(--ink); opacity:.86; font-size:13.5px; }
  .muted { color:var(--muted); }
  .topics { display:flex; flex-wrap:wrap; gap:6px; }
  .topic { font-size:11px; color:var(--muted); background:var(--bg);
    border:1px solid var(--line); padding:1px 7px; border-radius:999px; }
  .stats { display:flex; flex-direction:column; align-items:flex-end; gap:5px; white-space:nowrap;
    font-variant-numeric:tabular-nums; }
  .stat { font-size:12px; color:var(--muted); }
  .stat.stars { color:var(--star); font-weight:650; font-size:13px; }
  .stat.vel { color:var(--gold); font-weight:600; }
  footer { margin-top:48px; color:var(--muted); font-size:12.5px; text-align:center; }
  @media (max-width:600px) {
    .repo { grid-template-columns:26px 1fr; }
    .stats { grid-column:1 / -1; flex-direction:row; flex-wrap:wrap; align-items:center;
      justify-content:flex-start; padding-left:40px; }
  }
</style>
  <div class="wrap">
    <header>
      <h1>Trending Infrastructure &amp; Platform Projects</h1>
      <p class="sub">Top ${esc(data.top_n)} per category · last updated <strong>${esc(updated)}</strong></p>
      <p class="method">GitHub has no official trending API, so each category is computed from the GitHub Search API
      (topic filters, <code>stars:&gt;${esc(data.star_floor)}</code>, pushed within ${esc(data.pushed_within_days)} days,
      non-archived) and ranked by <strong>velocity</strong> — average stars gained per month over the repo's lifetime
      — so fast-growing projects rank above all-time giants.</p>
    </header>
    <nav>${nav}</nav>
    ${sections}
    <footer>
      Generated by <code>scripts/trending-infra</code> · refreshed weekly via GitHub Actions.
    </footer>
  </div>`;
}

export const TITLE = 'Trending Infra & Platform Projects';

// Full standalone document for the repo file (openable via file://).
export function renderHtml(data) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(TITLE)}</title>
</head>
<body>
${renderBody(data)}
</body>
</html>
`;
}

// Run standalone: read the committed JSON and write output.
//   default            -> full doc to docs/trending-infra.html
//   --artifact <path>  -> body-only (+ <title>) for the Artifact publisher
if (import.meta.url === `file://${process.argv[1]}`) {
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const artifactIdx = process.argv.indexOf('--artifact');
  if (artifactIdx !== -1 && process.argv[artifactIdx + 1]) {
    const out = process.argv[artifactIdx + 1];
    writeFileSync(out, `<title>${esc(TITLE)}</title>\n${renderBody(data)}\n`);
    console.error(`Wrote artifact body -> ${out}`);
  } else {
    writeFileSync(HTML_PATH, renderHtml(data));
    console.error(`Wrote ${HTML_PATH}`);
  }
}
