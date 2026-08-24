#!/usr/bin/env node
/** Print the image-less visualization prose for the named topics. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'capra', 'topics');
const files = ['devopsTopics.js','helmTopics.js','fluxTopics.js','controlPlaneTopics.js',
  'nativeBuildTopics.js','devopsTopicsExtra.js','k8sTopics.js','gitTopics.js'];
const mods = await Promise.all(files.map(f => import(path.join(DIR, f))));
const all = mods.flatMap(m => Object.values(m).filter(Array.isArray).flat()).filter(t => t && t.id && t.title);
for (const id of process.argv.slice(2)) {
  const t = all.find(x => x.id === id);
  if (!t) { console.log(`\n!! not found: ${id}`); continue; }
  console.log(`\n${'#'.repeat(72)}\n## ${t.id} — ${t.title}`);
  console.log(`## description (${t.description?.length || 0}): ${t.description || ''}`);
  if (t.introduction) console.log(`## introduction (${t.introduction.length}):\n${t.introduction}`);
  (t.visualizations || []).forEach((v, i) => {
    const fig = v.image || v.svg || v.video;
    if (fig) { console.log(`## viz[${i}] FIGURE (keep): "${v.title}" ${v.image || '(inline)'} caption:${(v.description||'').length}`); return; }
    console.log(`## viz[${i}] ESSAY: "${v.title}"\n${v.description || ''}`);
  });
  console.log(`## keyQuestions: ${(t.keyQuestions||[]).length}  quickFire: ${(t.quickFire||[]).length}  refs: ${(t.references||[]).length}`);
}
