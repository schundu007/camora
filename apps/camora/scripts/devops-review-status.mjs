#!/usr/bin/env node
/**
 * Worklist for the DevOps content review.
 *
 * A topic needs restructuring when it carries prose in `visualizations[]`
 * entries that have no figure — the "essay in a caption" shape. Prints the
 * remaining work in category order, which is the order the batches run in.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'capra', 'topics');
const imp = (f) => import(path.join(DIR, f));
const [mod, helm, flux, cp, nb, extra, k8s, git] = await Promise.all(
  ['devopsTopics.js','helmTopics.js','fluxTopics.js','controlPlaneTopics.js',
   'nativeBuildTopics.js','devopsTopicsExtra.js','k8sTopics.js','gitTopics.js'].map(imp));
const FILE_OF = new Map();
const tag = (arr, f) => (arr || []).forEach(t => FILE_OF.set(t.id, f));
tag(mod.devopsTopics,'devopsTopics.js'); tag(helm.helmTopics,'helmTopics.js');
tag(flux.fluxTopics,'fluxTopics.js'); tag(cp.controlPlaneTopics,'controlPlaneTopics.js');
tag(nb.nativeBuildTopics,'nativeBuildTopics.js'); tag(extra.devopsExtraTopics,'devopsTopicsExtra.js');
tag(k8s.k8sTopics,'k8sTopics.js'); tag(git.gitTopics,'gitTopics.js');

const topics = [...mod.devopsTopics, ...helm.helmTopics, ...flux.fluxTopics, ...cp.controlPlaneTopics,
  ...nb.nativeBuildTopics, ...extra.devopsExtraTopics, ...k8s.k8sTopics, ...git.gitTopics];
const map = { ...mod.devopsTopicCategoryMap, ...extra.devopsExtraTopicCategoryMap,
  ...k8s.k8sTopicCategoryMap, ...git.gitTopicCategoryMap };

const essays = (t) => (t.visualizations || []).filter(v => !v.image && !v.svg && !v.video);
const done = (t) => essays(t).length === 0 && (t.topics?.length || t.quickFire?.length);

let totalDone = 0, totalTodo = 0;
const rows = [];
for (const c of mod.devopsCategories) {
  const ts = topics.filter(t => map[t.id] === c.id);
  if (!ts.length) continue;
  const todo = ts.filter(t => !done(t));
  totalDone += ts.length - todo.length; totalTodo += todo.length;
  rows.push({ cat: c.id, total: ts.length, todo: todo.length,
    ids: todo.map(t => `${t.id}[${FILE_OF.get(t.id)}:${essays(t).length}e]`) });
}
const un = topics.filter(t => !map[t.id]);
if (un.length) {
  const todo = un.filter(t => !done(t));
  totalDone += un.length - todo.length; totalTodo += todo.length;
  rows.push({ cat: '(unmapped)', total: un.length, todo: todo.length,
    ids: todo.map(t => `${t.id}[${FILE_OF.get(t.id)}:${essays(t).length}e]`) });
}
console.log(`DevOps review: ${totalDone} done / ${totalDone + totalTodo} total — ${totalTodo} remaining\n`);
for (const r of rows) {
  console.log(`${String(r.todo).padStart(3)}/${String(r.total).padStart(3)}  ${r.cat}`);
  if (process.argv[2] === '-v' && r.ids.length) r.ids.forEach(i => console.log('        ' + i));
}
