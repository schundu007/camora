import { execInContainer } from '../playground/nomadClient.js';

const KUBECONFIG = 'KUBECONFIG=/etc/rancher/k3s/k3s.yaml';

async function kubectl(containerId, args) {
  const raw = await execInContainer(containerId, `${KUBECONFIG} kubectl ${args} -o json 2>/dev/null`);
  return JSON.parse(raw);
}

async function getPod(containerId, name, namespace) {
  try { return await kubectl(containerId, `get pod ${name} -n ${namespace}`); } catch { return null; }
}

async function getNamespace(containerId, name) {
  try { return await kubectl(containerId, `get namespace ${name}`); } catch { return null; }
}

const VALIDATORS = {
  async pod_exists(containerId, spec) {
    const pod = await getPod(containerId, spec.name, spec.namespace);
    if (!pod) return { pass: false, message: `Pod ${spec.name} not found in ${spec.namespace}` };
    if (spec.image) {
      const images = (pod.spec?.containers ?? []).map(c => c.image);
      if (!images.some(img => img === spec.image || img.startsWith(spec.image.split(':')[0]))) {
        return { pass: false, message: `Pod exists but image mismatch — found: ${images.join(', ')}` };
      }
    }
    return { pass: true, message: `Pod ${spec.name} exists` };
  },

  async pod_absent(containerId, spec) {
    const pod = await getPod(containerId, spec.name, spec.namespace);
    if (pod) return { pass: false, message: `Pod ${spec.name} still exists` };
    return { pass: true, message: `Pod ${spec.name} is gone` };
  },

  async pod_phase(containerId, spec) {
    const pod = await getPod(containerId, spec.name, spec.namespace);
    if (!pod) return { pass: false, message: `Pod ${spec.name} not found` };
    const phase = pod.status?.phase ?? 'Unknown';
    if (phase !== spec.phase) return { pass: false, message: `Pod phase is ${phase}, expected ${spec.phase}` };
    return { pass: true, message: `Pod is ${phase}` };
  },

  async pod_label(containerId, spec) {
    const pod = await getPod(containerId, spec.name, spec.namespace);
    if (!pod) return { pass: false, message: `Pod ${spec.name} not found` };
    const val = pod.metadata?.labels?.[spec.label_key];
    if (val !== spec.label_value) return { pass: false, message: `Label ${spec.label_key}=${val ?? '(missing)'}, expected ${spec.label_value}` };
    return { pass: true, message: `Label ${spec.label_key}=${spec.label_value} confirmed` };
  },

  async pod_annotation(containerId, spec) {
    const pod = await getPod(containerId, spec.name, spec.namespace);
    if (!pod) return { pass: false, message: `Pod ${spec.name} not found` };
    const val = pod.metadata?.annotations?.[spec.annotation_key];
    if (val !== spec.annotation_value) return { pass: false, message: `Annotation ${spec.annotation_key}=${val ?? '(missing)'}, expected ${spec.annotation_value}` };
    return { pass: true, message: `Annotation verified` };
  },

  async pod_annotation_absent(containerId, spec) {
    const pod = await getPod(containerId, spec.name, spec.namespace);
    if (!pod) return { pass: false, message: `Pod ${spec.name} not found` };
    const val = pod.metadata?.annotations?.[spec.annotation_key];
    if (val !== undefined) return { pass: false, message: `Annotation ${spec.annotation_key} still present (value: ${val})` };
    return { pass: true, message: `Annotation removed` };
  },

  async pod_resources(containerId, spec) {
    const pod = await getPod(containerId, spec.name, spec.namespace);
    if (!pod) return { pass: false, message: `Pod ${spec.name} not found` };
    const container = pod.spec?.containers?.[0];
    const limits = container?.resources?.limits ?? {};
    if (spec.memory_limit && limits.memory !== spec.memory_limit) {
      return { pass: false, message: `Memory limit is ${limits.memory ?? '(none)'}, expected ${spec.memory_limit}` };
    }
    if (spec.cpu_limit && limits.cpu !== spec.cpu_limit) {
      return { pass: false, message: `CPU limit is ${limits.cpu ?? '(none)'}, expected ${spec.cpu_limit}` };
    }
    return { pass: true, message: `Resource limits verified` };
  },

  async namespace_exists(containerId, spec) {
    const ns = await getNamespace(containerId, spec.name);
    if (!ns) return { pass: false, message: `Namespace ${spec.name} not found` };
    return { pass: true, message: `Namespace ${spec.name} exists` };
  },

  async namespace_absent(containerId, spec) {
    const ns = await getNamespace(containerId, spec.name);
    if (ns) return { pass: false, message: `Namespace ${spec.name} still exists` };
    return { pass: true, message: `Namespace ${spec.name} is gone` };
  },
};

export async function validateExercise(containerId, spec) {
  const fn = VALIDATORS[spec.type];
  if (!fn) return { pass: false, message: `Unknown spec type: ${spec.type}` };
  try {
    return await fn(containerId, spec);
  } catch (err) {
    return { pass: false, message: `Validation error: ${err.message}` };
  }
}
