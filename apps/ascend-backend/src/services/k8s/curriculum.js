import { query } from '../../config/database.js';

const TOPICS = [
  {
    module: 1, position: 1, slug: 'pods',
    title: 'Pods',
    summary: 'The smallest deployable unit in Kubernetes — one or more containers sharing network and storage.',
    exercises: [
      {
        position: 1,
        title: 'Run your first pod',
        prompt: 'Create a pod named `nginx` using the `nginx:alpine` image in the `default` namespace.',
        hint: 'kubectl run nginx --image=nginx:alpine',
        spec: { type: 'pod_exists', name: 'nginx', namespace: 'default', image: 'nginx:alpine' },
      },
      {
        position: 2,
        title: 'Pod reaches Running phase',
        prompt: 'Wait until the `nginx` pod in `default` namespace is in the Running phase.',
        hint: 'kubectl get pod nginx -w',
        spec: { type: 'pod_phase', name: 'nginx', namespace: 'default', phase: 'Running' },
      },
      {
        position: 3,
        title: 'Create a pod with resource limits',
        prompt: 'Create a pod named `limited` using `busybox:latest` with memory limit 64Mi and CPU limit 100m.',
        hint: 'Use kubectl run with --limits flag',
        spec: { type: 'pod_resources', name: 'limited', namespace: 'default', memory_limit: '64Mi', cpu_limit: '100m' },
      },
      {
        position: 4,
        title: 'Delete a pod',
        prompt: 'Delete the pod named `nginx` from the `default` namespace.',
        hint: 'kubectl delete pod nginx',
        spec: { type: 'pod_absent', name: 'nginx', namespace: 'default' },
      },
    ],
  },
  {
    module: 1, position: 2, slug: 'namespaces',
    title: 'Namespaces',
    summary: 'Virtual clusters within a cluster — isolate resources and teams within the same Kubernetes cluster.',
    exercises: [
      {
        position: 1,
        title: 'Create a namespace',
        prompt: 'Create a namespace named `dev`.',
        hint: 'kubectl create namespace dev',
        spec: { type: 'namespace_exists', name: 'dev' },
      },
      {
        position: 2,
        title: 'Run a pod in a custom namespace',
        prompt: 'Create a pod named `webserver` using `nginx:alpine` in the `dev` namespace.',
        hint: 'kubectl run webserver --image=nginx:alpine -n dev',
        spec: { type: 'pod_exists', name: 'webserver', namespace: 'dev', image: 'nginx:alpine' },
      },
      {
        position: 3,
        title: 'List pods across all namespaces',
        prompt: 'Verify `webserver` appears when listing pods across all namespaces (--all-namespaces).',
        hint: 'kubectl get pods --all-namespaces',
        spec: { type: 'pod_exists', name: 'webserver', namespace: 'dev' },
      },
      {
        position: 4,
        title: 'Delete namespace',
        prompt: 'Delete the `dev` namespace (this removes all resources inside it).',
        hint: 'kubectl delete namespace dev',
        spec: { type: 'namespace_absent', name: 'dev' },
      },
    ],
  },
  {
    module: 1, position: 3, slug: 'labels-selectors',
    title: 'Labels & Selectors',
    summary: 'Key-value metadata used to organise and select Kubernetes objects — the backbone of Services and Deployments.',
    exercises: [
      {
        position: 1,
        title: 'Create a labelled pod',
        prompt: 'Create a pod named `frontend` using `nginx:alpine` with label `app=frontend` in the `default` namespace.',
        hint: 'kubectl run frontend --image=nginx:alpine --labels=app=frontend',
        spec: { type: 'pod_label', name: 'frontend', namespace: 'default', label_key: 'app', label_value: 'frontend' },
      },
      {
        position: 2,
        title: 'Add a label to a running pod',
        prompt: 'Add label `tier=web` to the `frontend` pod.',
        hint: 'kubectl label pod frontend tier=web',
        spec: { type: 'pod_label', name: 'frontend', namespace: 'default', label_key: 'tier', label_value: 'web' },
      },
      {
        position: 3,
        title: 'Select pods by label',
        prompt: 'Create a second pod named `backend` using `busybox:latest` with label `app=backend`. Both `frontend` and `backend` should exist in `default`.',
        hint: 'kubectl run backend --image=busybox:latest --labels=app=backend -- sleep 3600',
        spec: { type: 'pod_label', name: 'backend', namespace: 'default', label_key: 'app', label_value: 'backend' },
      },
    ],
  },
  {
    module: 1, position: 4, slug: 'annotations',
    title: 'Annotations',
    summary: 'Non-identifying metadata attached to objects — used for tooling, build info, and configuration hints.',
    exercises: [
      {
        position: 1,
        title: 'Annotate a pod',
        prompt: 'Create a pod named `api` using `nginx:alpine` in `default`, then add annotation `maintainer=platform-team`.',
        hint: 'kubectl annotate pod api maintainer=platform-team',
        spec: { type: 'pod_annotation', name: 'api', namespace: 'default', annotation_key: 'maintainer', annotation_value: 'platform-team' },
      },
      {
        position: 2,
        title: 'Overwrite an annotation',
        prompt: 'Update the `maintainer` annotation on `api` to `sre-team` (use --overwrite).',
        hint: 'kubectl annotate pod api maintainer=sre-team --overwrite',
        spec: { type: 'pod_annotation', name: 'api', namespace: 'default', annotation_key: 'maintainer', annotation_value: 'sre-team' },
      },
      {
        position: 3,
        title: 'Remove an annotation',
        prompt: 'Remove the `maintainer` annotation from `api` (append `-` to the key).',
        hint: 'kubectl annotate pod api maintainer-',
        spec: { type: 'pod_annotation_absent', name: 'api', namespace: 'default', annotation_key: 'maintainer' },
      },
    ],
  },
];

export async function seedK8sCurriculum() {
  for (const topic of TOPICS) {
    const { slug, module: mod, position, title, summary, exercises } = topic;
    await query(
      `INSERT INTO k8s_topics (module, position, slug, title, summary)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, summary=EXCLUDED.summary`,
      [mod, position, slug, title, summary],
    );
    for (const ex of exercises) {
      await query(
        `INSERT INTO k8s_exercises (topic_slug, position, title, prompt, hint, spec)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT DO NOTHING`,
        [slug, ex.position, ex.title, ex.prompt, ex.hint ?? null, JSON.stringify(ex.spec)],
      );
    }
  }
  console.log('[K8s Curriculum] Module 1 seeded (4 topics, 14 exercises)');
}
