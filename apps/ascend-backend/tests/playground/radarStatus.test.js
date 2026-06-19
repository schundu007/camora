import { describe, it, expect } from 'vitest';

const K8S_ENVS_SET = new Set(['k8s-single', 'k8s-multi', 'k8s-etcd']);

function computeRadarStatus(session) {
  const radarAvailable = K8S_ENVS_SET.has(session.environment) && !!session.radar_port;
  const radarReady = radarAvailable && !!session.radar_ready;
  return { radarAvailable, radarReady, radarUrl: radarAvailable ? `/pg-radar?_s=${session.id}` : null };
}

describe('radar-status logic', () => {
  it('ubuntu session → radarAvailable false', () => {
    const r = computeRadarStatus({ id: 'a', environment: 'ubuntu', radar_port: null, radar_ready: false });
    expect(r.radarAvailable).toBe(false);
    expect(r.radarUrl).toBeNull();
  });

  it('k8s-single with radar_port but not ready → radarAvailable true, radarReady false', () => {
    const r = computeRadarStatus({ id: 'b', environment: 'k8s-single', radar_port: 31200, radar_ready: false });
    expect(r.radarAvailable).toBe(true);
    expect(r.radarReady).toBe(false);
    expect(r.radarUrl).toBe('/pg-radar?_s=b');
  });

  it('k8s-multi fully ready → radarReady true', () => {
    const r = computeRadarStatus({ id: 'c', environment: 'k8s-multi', radar_port: 31201, radar_ready: true });
    expect(r.radarReady).toBe(true);
  });
});
