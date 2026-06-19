export function parseClusterList(list) {
  const items = list?.items ?? [];
  const pods     = items.filter(i => i.kind === 'Pod');
  const nodes    = items.filter(i => i.kind === 'Node');
  const services = items.filter(i => i.kind === 'Service');
  const events   = items
    .filter(i => i.kind === 'Event')
    .sort((a, b) =>
      new Date(b.metadata?.creationTimestamp ?? 0) - new Date(a.metadata?.creationTimestamp ?? 0)
    )
    .slice(0, 10);
  return { pods, nodes, events, services };
}

export function getExecContainer(session) {
  if (session.environment === 'k8s-multi') {
    const nodes = typeof session.cluster_nodes === 'string'
      ? JSON.parse(session.cluster_nodes)
      : (session.cluster_nodes ?? []);
    const server = nodes.find(n => n.role === 'server') ?? nodes[0];
    return server?.containerId ?? null;
  }
  return session.nomad_job_id ?? null;
}
