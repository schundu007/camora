#!/usr/bin/env node
/**
 * Probes CodeSignal API endpoints to find the task/problem list endpoint.
 * Run after extract-cookies.js. Results guide which endpoint sync.js uses.
 *
 * Usage: node probe-api.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { cookieStr, companyId, userId } = JSON.parse(
  readFileSync(join(__dirname, '.codesignal-cookies.json'), 'utf8')
);

const HEADERS = {
  Cookie: cookieStr,
  Accept: 'application/json, */*',
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://app.codesignal.com/',
  Origin: 'https://app.codesignal.com',
  'x-requested-with': 'XMLHttpRequest',
};

async function get(url) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { url, status: res.status, json, preview: text.slice(0, 300) };
  } catch (e) {
    return { url, status: 'ERR', error: e.message };
  }
}

async function gql(query, variables = {}) {
  try {
    const res = await fetch('https://app.codesignal.com/graphql', {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ query, variables }),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, preview: text.slice(0, 400) };
  } catch (e) {
    return { status: 'ERR', error: e.message };
  }
}

function report(label, r) {
  const ok = r.status === 200 && r.json && !r.json?.errors;
  const icon = ok ? '✓' : (r.status === 200 ? '~' : '✗');
  console.log(`  ${icon} [${r.status}] ${label}`);
  if (ok || r.status === 200) {
    const keys = r.json ? Object.keys(r.json).slice(0, 8).join(', ') : '(non-JSON)';
    console.log(`    keys: ${keys}`);
    console.log(`    preview: ${r.preview?.slice(0, 200)}`);
  }
  return ok;
}

async function main() {
  console.log(`\nCodeSignal API Probe`);
  console.log(`companyId: ${companyId ?? '(not detected)'}`);
  console.log(`userId:    ${userId ?? '(not detected)'}`);
  console.log('─'.repeat(60));

  // ── 1. REST candidates ──────────────────────────────────────────
  console.log('\n[1] REST endpoints');

  const restCandidates = [
    'https://app.codesignal.com/api/v1/tasks',
    'https://app.codesignal.com/api/tasks',
    'https://app.codesignal.com/api/v1/problems',
    'https://app.codesignal.com/api/v1/arcade',
    'https://app.codesignal.com/api/v1/arcade/tasks',
    'https://app.codesignal.com/api/v1/questions',
    ...(companyId ? [
      `https://app.codesignal.com/api/v1/company/${companyId}/tasks`,
      `https://app.codesignal.com/api/v1/company/${companyId}/questions`,
      `https://app.codesignal.com/api/company/${companyId}/tasks`,
    ] : []),
  ];

  for (const url of restCandidates) {
    const r = await get(url);
    report(url, r);
  }

  // ── 2. GraphQL introspection ────────────────────────────────────
  console.log('\n[2] GraphQL introspection');
  const intro = await gql('{ __schema { queryType { name } } }');
  report('introspection', intro);

  // ── 3. GraphQL — arcade/practice tasks ─────────────────────────
  console.log('\n[3] GraphQL — arcade / practice tasks');

  const arcadeQueries = [
    {
      label: 'arcadeTasks',
      query: `query { arcadeTasks(limit: 5, offset: 0) { id title difficulty category } }`,
    },
    {
      label: 'tasks (generic)',
      query: `query { tasks(limit: 5, offset: 0) { id title difficulty } }`,
    },
    {
      label: 'questions',
      query: `query { questions(limit: 5, offset: 0) { id title difficulty } }`,
    },
    {
      label: 'practiceQuestions',
      query: `query { practiceQuestions(limit: 5, offset: 0) { id title } }`,
    },
    {
      label: 'taskLibrary',
      query: `query { taskLibrary(limit: 5, offset: 0) { tasks { id title difficulty } totalCount } }`,
    },
    {
      label: 'publicTasks',
      query: `query { publicTasks(limit: 5) { id title difficulty category } }`,
    },
    {
      label: 'codingTasks (cursor)',
      query: `query { codingTasks(first: 5) { edges { node { id title difficulty } } } }`,
    },
  ];

  for (const { label, query } of arcadeQueries) {
    const r = await gql(query);
    report(`GQL ${label}`, r);
    if (r.status === 200 && r.json && !r.json.errors) {
      console.log('    *** WORKING QUERY ***');
      console.log('    Full response:', JSON.stringify(r.json, null, 2).slice(0, 600));
    }
  }

  // ── 4. GraphQL — company/assessment tasks ──────────────────────
  if (companyId) {
    console.log('\n[4] GraphQL — company assessment tasks');

    const companyQueries = [
      {
        label: 'companyTasks',
        query: `query CompanyTasks($companyId: ID!) { companyTasks(companyId: $companyId, limit: 5, offset: 0) { id title difficulty category } }`,
        variables: { companyId },
      },
      {
        label: 'companyLibrary',
        query: `query CompanyLibrary($companyId: ID!) { companyLibrary(companyId: $companyId, limit: 5, offset: 0) { tasks { id title difficulty } totalCount } }`,
        variables: { companyId },
      },
      {
        label: 'questionBank',
        query: `query QuestionBank($companyId: ID!) { questionBank(companyId: $companyId, limit: 5, offset: 0) { id title category } }`,
        variables: { companyId },
      },
    ];

    for (const { label, query, variables } of companyQueries) {
      const r = await gql(query, variables);
      report(`GQL ${label}`, r);
      if (r.status === 200 && r.json && !r.json.errors) {
        console.log('    *** WORKING QUERY ***');
        console.log('    Full response:', JSON.stringify(r.json, null, 2).slice(0, 600));
      }
    }
  }

  // ── 5. Alternative base URLs ────────────────────────────────────
  console.log('\n[5] Alternative base URLs');
  const altCandidates = [
    'https://codescreen.com/api/tasks',
    'https://api.codesignal.com/v1/tasks',
    'https://api.codesignal.com/v1/questions',
    'https://app.codesignal.com/api/v2/tasks',
  ];
  for (const url of altCandidates) {
    const r = await get(url);
    report(url, r);
  }

  console.log('\n─'.repeat(60));
  console.log('Done. Share the output above to identify working endpoints.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
