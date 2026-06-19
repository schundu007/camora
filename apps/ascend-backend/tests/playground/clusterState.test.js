import { describe, it, expect } from 'vitest';
import { parseClusterList, getExecContainer } from '../../src/services/playground/clusterState.js';

const MOCK_LIST = {
  items: [
    { kind: 'Pod',     metadata: { name: 'nginx', namespace: 'default', creationTimestamp: '2026-06-19T00:00:00Z' }, status: { phase: 'Running' }, spec: { nodeName: 'k3s-server' } },
    { kind: 'Node',    metadata: { name: 'k3s-server', creationTimestamp: '2026-06-19T00:00:00Z' }, status: { conditions: [{ type: 'Ready', status: 'True' }] } },
    { kind: 'Service', metadata: { name: 'kubernetes', namespace: 'default', creationTimestamp: '2026-06-19T00:00:00Z' }, spec: { type: 'ClusterIP', ports: [{ port: 443 }] } },
    { kind: 'Event',   metadata: { name: 'ev1', namespace: 'default', creationTimestamp: '2026-06-19T00:01:00Z' }, reason: 'Scheduled', message: 'assigned', type: 'Normal', involvedObject: { name: 'nginx' } },
  ],
};

describe('parseClusterList', () => {
  it('splits items by kind', () => {
    const r = parseClusterList(MOCK_LIST);
    expect(r.pods).toHaveLength(1);
    expect(r.nodes).toHaveLength(1);
    expect(r.services).toHaveLength(1);
    expect(r.events).toHaveLength(1);
  });

  it('returns empty arrays when items is empty', () => {
    const r = parseClusterList({ items: [] });
    expect(r.pods).toEqual([]);
    expect(r.nodes).toEqual([]);
    expect(r.events).toEqual([]);
    expect(r.services).toEqual([]);
  });

  it('caps events at 10 most recent', () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      kind: 'Event', metadata: { name: `ev${i}`, creationTimestamp: `2026-06-19T00:${String(i).padStart(2,'0')}:00Z` },
    }));
    const r = parseClusterList({ items });
    expect(r.events).toHaveLength(10);
  });
});

describe('getExecContainer', () => {
  it('returns nomad_job_id for k8s-single', () => {
    expect(getExecContainer({ environment: 'k8s-single', nomad_job_id: 'abc123', cluster_nodes: null })).toBe('abc123');
  });

  it('returns server node containerId for k8s-multi', () => {
    const nodes = [{ role: 'server', containerId: 'srv001' }, { role: 'agent', containerId: 'agt001' }];
    expect(getExecContainer({ environment: 'k8s-multi', cluster_nodes: JSON.stringify(nodes) })).toBe('srv001');
  });
});
