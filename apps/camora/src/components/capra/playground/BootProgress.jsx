import { useState, useEffect } from 'react';

const TOOL_STATUS_ICON = {
  checking:   { icon: '○', color: 'rgba(255,255,255,0.3)' },
  installing: { icon: '◉', color: '#f59e0b', spin: true },
  done:       { icon: '✓', color: '#10b981' },
  skipped:    { icon: '–', color: 'rgba(255,255,255,0.25)' },
  error:      { icon: '✗', color: '#ef4444' },
  running:    { icon: '◉', color: '#f59e0b', spin: true },
};

const SYSTEM_STEPS = ['container_ready', 'env_setup', 'ide_start', 'terminal_ready'];

export default function BootProgress({ steps = [], totalSteps = 4, environment }) {
  const [elapsed, setElapsed] = useState(0);

  const systemSteps = steps.filter(s => SYSTEM_STEPS.includes(s.step));
  const envSubSteps = steps.filter(s => s.step.startsWith('env_sub_'));
  const setupHeader = steps.find(s => s.step === 'custom_tools_header');
  const toolSteps = steps.filter(s => s.step.startsWith('tool_'));
  const isCustom = !!setupHeader;
  const allDone = setupHeader
    ? setupHeader.status === 'done'
    : systemSteps.filter(s => s.status === 'done').length >= 4;

  const envSetupStatus = systemSteps.find(s => s.step === 'env_setup')?.status;
  const isEnvRunning = envSetupStatus === 'running';

  useEffect(() => {
    if (!isEnvRunning) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isEnvRunning]);

  if (!steps.length) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: '#0d1117',
      }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.08)',
          borderTopColor: '#f59e0b',
          animation: 'spin 0.9s linear infinite',
          marginBottom: 16,
        }} />
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: 'var(--font-mono)' }}>
          Allocating container...
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117', overflowY: 'auto' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>

      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '18px 24px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {!allDone ? (
          <div style={{
            width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: '#f59e0b',
            animation: 'spin 0.9s linear infinite',
          }} />
        ) : (
          <span style={{ color: '#10b981', fontSize: 14, flexShrink: 0 }}>✓</span>
        )}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
            {allDone ? 'Playground Ready' : 'Booting Playground'}
          </div>
          <div style={{
            fontSize: 12, color: allDone ? '#10b981' : '#f59e0b',
            fontFamily: 'var(--font-mono)', marginTop: 4, fontWeight: 600,
          }}>
            {allDone ? 'All systems ready' : isCustom && toolSteps.length > 0 ? 'Installing tools...' : 'Starting services...'}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* System steps */}
        <div>
          <div style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.25)', marginBottom: 8, fontFamily: 'var(--font-mono)',
          }}>
            System
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { step: 'container_ready', label: 'Container started' },
              { step: 'env_setup',       label: 'Environment starting' },
              { step: 'ide_start',       label: 'IDE ready' },
              { step: 'terminal_ready',  label: 'Terminal ready' },
            ].map(({ step, label }) => {
              const ev = systemSteps.find(s => s.step === step);
              const status = ev?.status || 'pending';
              const isEnvSetup = step === 'env_setup';
              const activeSubSteps = isEnvSetup ? envSubSteps : [];
              return (
                <div key={step}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 4,
                    background: status === 'done' ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${status === 'done' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                    {status === 'done' && <span style={{ color: '#10b981', fontSize: 12, width: 12, textAlign: 'center' }}>✓</span>}
                    {status === 'running' && (
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        border: '1.5px solid rgba(245,158,11,0.2)',
                        borderTopColor: '#f59e0b',
                        animation: 'spin 0.9s linear infinite',
                      }} />
                    )}
                    {status === 'pending' && (
                      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12, width: 12, textAlign: 'center' }}>○</span>
                    )}
                    <span style={{
                      flex: 1,
                      fontSize: 12, fontFamily: 'var(--font-mono)',
                      color: status === 'done' ? 'rgba(255,255,255,0.5)' : status === 'running' ? '#fff' : 'rgba(255,255,255,0.18)',
                    }}>
                      {ev?.label || label}
                    </span>
                    {isEnvSetup && status === 'running' && elapsed > 0 && (
                      <span style={{
                        fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600,
                        color: elapsed > 60 ? '#f87171' : '#f59e0b',
                      }}>
                        {elapsed}s
                      </span>
                    )}
                  </div>

                  {/* Sub-steps under env_setup while running */}
                  {isEnvSetup && status === 'running' && (
                    <div style={{ paddingLeft: 30, marginTop: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {activeSubSteps.length === 0 ? (
                        <div style={{
                          fontSize: 12, color: 'rgba(255,255,255,0.2)',
                          fontFamily: 'var(--font-mono)', padding: '2px 0',
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }}>
                          Usually 30–60 seconds...
                        </div>
                      ) : (
                        activeSubSteps.map(sub => (
                          <div key={sub.step} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                            {sub.status === 'done' ? (
                              <span style={{ color: '#10b981', fontSize: 12, width: 10, flexShrink: 0 }}>✓</span>
                            ) : (
                              <div style={{
                                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                border: '1.5px solid rgba(245,158,11,0.15)',
                                borderTopColor: '#f59e0b',
                                animation: 'spin 0.9s linear infinite',
                              }} />
                            )}
                            <span style={{
                              fontSize: 12, fontFamily: 'var(--font-mono)',
                              color: sub.status === 'done' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)',
                            }}>
                              {sub.label}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-tool setup phase */}
        {isCustom && (
          <div>
            <div style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: setupHeader?.status === 'done' ? 'rgba(16,185,129,0.6)' : 'rgba(245,158,11,0.7)',
              marginBottom: 8, fontFamily: 'var(--font-mono)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {setupHeader?.status === 'done' ? '✓ ' : ''}Setup
              {setupHeader?.status !== 'done' && toolSteps.length > 0 && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>
                  · {toolSteps.filter(t => t.status === 'done').length}/{toolSteps.length} done
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {toolSteps.length === 0 && setupHeader?.status === 'running' && (
                <div style={{
                  padding: '8px 10px', borderRadius: 4,
                  background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)',
                  fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}>
                  Preparing package lists...
                </div>
              )}
              {toolSteps.map((tool) => {
                const ts = tool.toolStatus || (tool.status === 'done' ? 'done' : 'running');
                const meta = TOOL_STATUS_ICON[ts] || TOOL_STATUS_ICON.running;
                return (
                  <div key={tool.step} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 4,
                    background: ts === 'done' ? 'rgba(16,185,129,0.05)'
                      : ts === 'skipped' ? 'rgba(255,255,255,0.015)'
                      : ts === 'error' ? 'rgba(239,68,68,0.06)'
                      : 'rgba(245,158,11,0.06)',
                    border: `1px solid ${
                      ts === 'done' ? 'rgba(16,185,129,0.12)'
                      : ts === 'skipped' ? 'rgba(255,255,255,0.04)'
                      : ts === 'error' ? 'rgba(239,68,68,0.2)'
                      : 'rgba(245,158,11,0.15)'}`,
                  }}>
                    {meta.spin ? (
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        border: '1.5px solid rgba(245,158,11,0.2)',
                        borderTopColor: meta.color,
                        animation: 'spin 0.9s linear infinite',
                      }} />
                    ) : (
                      <span style={{ color: meta.color, fontSize: 12, width: 10, textAlign: 'center', flexShrink: 0 }}>
                        {meta.icon}
                      </span>
                    )}
                    <span style={{
                      flex: 1, fontSize: 12, fontFamily: 'var(--font-mono)',
                      color: ts === 'done' ? 'rgba(255,255,255,0.5)'
                        : ts === 'skipped' ? 'rgba(255,255,255,0.2)'
                        : ts === 'error' ? '#ef4444'
                        : '#fff',
                    }}>
                      {tool.label}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)',
                      color: ts === 'done' ? '#10b981'
                        : ts === 'skipped' ? 'rgba(255,255,255,0.18)'
                        : ts === 'error' ? '#ef4444'
                        : '#f59e0b',
                    }}>
                      {ts === 'checking' ? 'checking' : ts === 'installing' ? 'installing...' : ts}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
