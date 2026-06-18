export default function BootProgress({ steps = [], totalSteps = 4, environment }) {
  const completedCount = steps.filter(s => s.status === 'done').length;
  const hasEvents = steps.length > 0;

  const phases = {};
  for (const step of steps) {
    const ph = step.phase || 'SYSTEM';
    if (!phases[ph]) phases[ph] = [];
    phases[ph].push(step);
  }

  if (!hasEvents) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: '#1c1c1e',
      }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.08)',
          borderTopColor: 'rgba(255,255,255,0.35)',
          animation: 'spin 1s linear infinite',
          marginBottom: 20,
        }} />
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: 0, letterSpacing: '-0.01em' }}>
          Warming up playground...
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
          Init tasks completed: 0/{totalSteps}
        </p>
      </div>
    );
  }

  const allDone = completedCount >= totalSteps;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111827', overflowY: 'auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ padding: '28px 36px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          {!allDone ? (
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.15)',
              borderTopColor: 'rgba(255,255,255,0.6)',
              animation: 'spin 1s linear infinite', flexShrink: 0,
            }} />
          ) : (
            <span style={{ color: '#10b981', fontSize: 15 }}>✓</span>
          )}
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>
            {allDone ? 'Playground Ready' : 'Booting Playground'}
          </h2>
        </div>
        <p style={{
          margin: '0 0 6px', fontSize: 12, color: '#f59e0b',
          fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600,
        }}>
          State: <span style={{ color: allDone ? '#10b981' : '#f59e0b' }}>{allDone ? 'Ready' : 'Starting'}</span>
        </p>
        {!allDone && (
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            Waiting for playground to become ready...
          </p>
        )}
      </div>

      {/* Phase groups */}
      <div style={{ padding: '24px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {Object.entries(phases).map(([phase, phaseSteps]) => (
          <div key={phase}>
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
              margin: '0 0 8px', fontFamily: '"IBM Plex Mono", monospace',
            }}>
              {phase}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {phaseSteps.map((step) => (
                <div key={step.step} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 4,
                }}>
                  <span style={{
                    fontSize: 12, color: 'rgba(255,255,255,0.65)',
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}>
                    {step.label}
                  </span>
                  {step.status === 'done' && (
                    <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>
                      ✓ True
                    </span>
                  )}
                  {step.status === 'running' && (
                    <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>
                      Starting
                    </span>
                  )}
                  {step.status === 'error' && (
                    <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, fontFamily: 'monospace' }}>
                      Error
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
