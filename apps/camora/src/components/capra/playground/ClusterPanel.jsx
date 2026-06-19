import { useClusterState } from '@/hooks/useClusterState';

function PodRow({ pod }) {
  const phase = pod.status?.phase ?? 'Unknown';
  const ready = pod.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True';
  const color = phase === 'Running' ? '#10b981' : phase === 'Pending' ? '#f59e0b' : '#ef4444';
  return (
    <tr>
      <td style={td}><span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 11 }}>{pod.metadata?.namespace ?? '-'}</span></td>
      <td style={td}><span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 11 }}>{pod.metadata?.name ?? '-'}</span></td>
      <td style={td}><span style={{ color, fontWeight: 700, fontSize: 11 }}>{phase}</span></td>
      <td style={td}><span style={{ fontSize: 11, color: ready ? '#10b981' : 'rgba(255,255,255,0.3)' }}>{ready ? 'Ready' : 'Not ready'}</span></td>
      <td style={td}><span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{pod.spec?.nodeName ?? '-'}</span></td>
    </tr>
  );
}

function NodeRow({ node }) {
  const ready = node.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True';
  const version = node.status?.nodeInfo?.kubeletVersion ?? '-';
  return (
    <tr>
      <td style={td}><span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 11 }}>{node.metadata?.name ?? '-'}</span></td>
      <td style={td}><span style={{ color: ready ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 11 }}>{ready ? 'Ready' : 'NotReady'}</span></td>
      <td style={td}><span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{version}</span></td>
    </tr>
  );
}

function EventRow({ event }) {
  const isWarn = event.type === 'Warning';
  return (
    <tr>
      <td style={td}><span style={{ fontSize: 10, color: isWarn ? '#f59e0b' : 'rgba(255,255,255,0.4)' }}>{event.type}</span></td>
      <td style={td}><span style={{ fontSize: 11, fontFamily: '"IBM Plex Mono",monospace', color: 'rgba(255,255,255,0.6)' }}>{event.reason ?? '-'}</span></td>
      <td style={td}><span style={{ fontSize: 11, fontFamily: '"IBM Plex Mono",monospace', color: 'rgba(255,255,255,0.4)' }}>{event.involvedObject?.name ?? '-'}</span></td>
      <td style={{ ...td, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{event.message ?? '-'}</span>
      </td>
    </tr>
  );
}

function SvcRow({ svc }) {
  const type = svc.spec?.type ?? '-';
  const ports = (svc.spec?.ports ?? []).map(p => `${p.port}/${p.protocol ?? 'TCP'}`).join(', ') || '-';
  return (
    <tr>
      <td style={td}><span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 11 }}>{svc.metadata?.namespace ?? '-'}</span></td>
      <td style={td}><span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 11 }}>{svc.metadata?.name ?? '-'}</span></td>
      <td style={td}><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{type}</span></td>
      <td style={td}><span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{ports}</span></td>
    </tr>
  );
}

function Section({ title, count, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

export default function ClusterPanel({ sessionId, enabled }) {
  const { state, error } = useClusterState(sessionId, enabled);

  if (!enabled) return null;

  if (!state && !error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Waiting for cluster state...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ fontSize: 12, color: '#f87171' }}>Cluster not ready — run kubectl to start</span>
      </div>
    );
  }

  const { pods = [], nodes = [], events = [], services = [] } = state;

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '16px 20px', background: '#0d1117' }}>
      <Section title="Nodes" count={nodes.length}>
        {nodes.length === 0
          ? <Empty text="No nodes detected yet" />
          : <Table cols={['Name', 'Status', 'Version']}>{nodes.map((n, i) => <NodeRow key={i} node={n} />)}</Table>}
      </Section>

      <Section title="Pods" count={pods.length}>
        {pods.length === 0
          ? <Empty text="No pods running" />
          : <Table cols={['Namespace', 'Name', 'Phase', 'Ready', 'Node']}>{pods.map((p, i) => <PodRow key={i} pod={p} />)}</Table>}
      </Section>

      <Section title="Services" count={services.length}>
        {services.length === 0
          ? <Empty text="No services" />
          : <Table cols={['Namespace', 'Name', 'Type', 'Ports']}>{services.map((s, i) => <SvcRow key={i} svc={s} />)}</Table>}
      </Section>

      <Section title="Recent Events" count={events.length}>
        {events.length === 0
          ? <Empty text="No events" />
          : <Table cols={['Type', 'Reason', 'Object', 'Message']}>{events.map((e, i) => <EventRow key={i} event={e} />)}</Table>}
      </Section>
    </div>
  );
}

function Empty({ text }) {
  return <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: '4px 0 0', fontStyle: 'italic' }}>{text}</p>;
}

function Table({ cols, children }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {cols.map(c => (
            <th key={c} style={{ ...td, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 4, textAlign: 'left' }}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

const td = {
  padding: '4px 8px 4px 0',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'middle',
  color: 'rgba(255,255,255,0.75)',
};
