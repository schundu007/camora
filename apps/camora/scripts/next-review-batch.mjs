#!/usr/bin/env node
/** Print the next N DevOps topics that still have no chapters, with context. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'capra', 'topics');
const files = ['devopsTopics.js','helmTopics.js','fluxTopics.js','controlPlaneTopics.js',
  'nativeBuildTopics.js','devopsTopicsExtra.js','k8sTopics.js'];
const mods = await Promise.all(files.map(f => import(path.join(DIR, f))));
const owner = new Map();
files.forEach((f, i) => Object.values(mods[i]).filter(Array.isArray).flat()
  .filter(t => t && t.id && t.title).forEach(t => { if (!owner.has(t.id)) owner.set(t.id, f); }));
const all = mods.flatMap(m => Object.values(m).filter(Array.isArray).flat()).filter(t => t && t.id && t.title);
const seen = new Set();
const todo = all.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return !(t.topics || []).length; });
const n = Number(process.argv[2] || 5);
console.log(`# ${todo.length} topics still without chapters\n`);
for (const t of todo.slice(0, n)) {
  console.log(`\n${'='.repeat(70)}\n## ${t.id}  [${owner.get(t.id)}]  — ${t.title}`);
  console.log(`desc: ${t.description || ''}`);
  console.log(`intro:\n${t.introduction || '(none)'}`);
  (t.keyQuestions || []).forEach(q => console.log(`  KQ: ${(q.question || q.q || '').slice(0, 110)}  [ans ${(q.answer || q.a || '').length}]`));
  (t.quickFire || []).forEach(q => console.log(`  QF: ${q.q}`));
  console.log(`  refs: ${(t.references || []).length}`);
}
