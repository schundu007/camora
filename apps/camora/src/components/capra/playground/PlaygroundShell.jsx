import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaygroundSession } from '@/hooks/usePlaygroundSession';
import { useDialog } from '@/components/shared/Dialog';
import EnvironmentPicker, { ENVIRONMENTS, EnvIcon } from './EnvironmentPicker';
import TerminalPane from './TerminalPane';

const TERMINAL_PREVIEW = `[32mcamora[0m:[34m~[0m$ `;

function formatTime(seconds) {
  if (seconds == null) return '30:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PlaygroundShell() {
  const { user } = useAuth();
  const { confirm } = useDialog();
  const {
    session,
    status,
    error,
    timeRemaining,
    extendAvailable,
    createSession,
    destroySession,
    extendSession,
  } = usePlaygroundSession();

  const [environment, setEnvironment] = useState('ubuntu');
  const [fontSize, setFontSize] = useState(13);
  const [showInstructions, setShowInstructions] = useState(false);
  const termRef = useRef(null);

  const isActive = status === 'ready' && !!session;
  const isCreating = status === 'creating';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const selectedEnv = ENVIRONMENTS.find((e) => e.id === environment) || ENVIRONMENTS[0];
  const timerStr = formatTime(timeRemaining);
  const isAmber = timeRemaining != null && timeRemaining < 300;
  const isRed = timeRemaining != null && timeRemaining < 60;
  const timerColor = isRed ? '#ef4444' : isAmber ? '#f59e0b' : 'rgba(255,255,255,0.6)';

  const handleEnd = useCallback(async () => {
    const ok = await confirm({ message: 'End session? The container will be destroyed.', tone: 'danger' });
    if (ok) destroySession();
  }, [confirm, destroySession]);

  const handleFontInc = useCallback(() => {
    setFontSize((f) => { const n = Math.min(18, f + 1); termRef.current?.setFontSize(n); return n; });
  }, []);
  const handleFontDec = useCallback(() => {
    setFontSize((f) => { const n = Math.max(10, f - 1); termRef.current?.setFontSize(n); return n; });
  }, []);

  if (isMobile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)', padding: 32, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⌨️</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Playground requires a desktop browser</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>Open Camora on a laptop or desktop to use the terminal.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflow: 'hidden', background: '#0d1117' }}>

      {isActive ? (
        <>
          {/* ── Row 1: Title bar — breadcrumb + timer + controls ── */}
          <div style={{
            flexShrink: 0,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 10px',
            background: '#0d1117',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 3 }}>⌨</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Camora Playground</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>›</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: '"IBM Plex Mono", monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedEnv.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 5px #10b981' }} />
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 700, color: timerColor, animation: isRed ? 'pulse 1s ease-in-out infinite' : undefined }}>{timerStr}</span>
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
              {[['A−', handleFontDec], ['A+', handleFontInc]].map(([label, fn]) => (
                <button key={label} type="button" onClick={fn} style={iconBtn} title={label}>{label}</button>
              ))}
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
              {extendAvailable && (
                <button type="button" onClick={extendSession} style={{ ...iconBtn, color: '#d4a043' }} title="Extend session">+15m</button>
              )}
              <button
                type="button"
                onClick={() => setShowInstructions((v) => !v)}
                style={{ ...iconBtn, color: showInstructions ? '#d4a043' : iconBtn.color }}
                title={showInstructions ? 'Hide instructions' : 'Show instructions'}
              >{showInstructions ? '⊟' : '⊞'}</button>
              <button type="button" onClick={handleEnd} style={{ ...iconBtn, color: '#f87171' }} title="End session">⏻</button>
            </div>
          </div>

          {/* ── Row 2: Tab bar — iximiuz-style pill chips ── */}
          <div style={{
            flexShrink: 0,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            gap: 4,
            background: '#161b22',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 8px 3px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              fontSize: 12, fontWeight: 600, color: '#fff',
              fontFamily: '"IBM Plex Mono", monospace', userSelect: 'none',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 5px #10b981', flexShrink: 0 }} />
              {selectedEnv.id === 'ubuntu' ? 'ubuntu-01' : selectedEnv.id === 'docker' ? 'docker-01' : selectedEnv.id === 'agent-sandbox' ? 'agent-01' : 'node-01'}
              <button type="button" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '0 0 0 2px', fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center' }} title="Reload">↻</button>
            </div>
            <button type="button" style={{ ...iconBtn, width: 24, height: 24, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, fontSize: 14 }} title="Add terminal">+</button>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 2 }}>
              <button type="button" onClick={() => setShowInstructions(false)} style={{ ...iconBtn, opacity: !showInstructions ? 1 : 0.4 }} title="Single pane">▣</button>
              <button type="button" onClick={() => setShowInstructions(true)} style={{ ...iconBtn, opacity: showInstructions ? 1 : 0.4 }} title="Split pane">⧉</button>
            </div>
          </div>

          {/* ── Active: instructions panel (LEFT) + terminal (RIGHT) ── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {showInstructions && (
              <div style={{
                width: 260, flexShrink: 0, background: '#111827',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                overflowY: 'auto', display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <EnvIcon icon={selectedEnv.icon} />  {selectedEnv.label}
                  </span>
                  <button type="button" onClick={() => setShowInstructions(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 15, padding: 0, lineHeight: 1 }}>×</button>
                </div>
                <div style={{ padding: '12px 14px', fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, flex: 1 }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                    {selectedEnv.category.split(' · ').map((cat) => (
                      <span key={cat} style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: `${selectedEnv.color}22`, color: selectedEnv.color }}>{cat}</span>
                    ))}
                  </div>
                  <p style={{ marginBottom: 10, color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{selectedEnv.desc}</p>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, padding: '7px 10px', fontFamily: 'monospace', fontSize: 10, color: '#10b981', marginBottom: 10, whiteSpace: 'pre' }}>{'$ whoami\nroot'}</div>
                  <p style={{ marginBottom: 8, fontSize: 10 }}>Session runs 30 minutes. Environment is ephemeral — all changes lost when session ends.</p>
                  {selectedEnv.id === 'agent-sandbox' && (
                    <>
                      <p style={{ fontWeight: 700, color: '#fff', marginBottom: 6, fontSize: 10 }}>Pre-installed agents:</p>
                      <ul style={{ margin: 0, paddingLeft: 14, fontSize: 10 }}>
                        {[['claude', 'Claude Code'], ['codex', 'OpenAI Codex'], ['gemini', 'Gemini CLI']].map(([cmd, name]) => (
                          <li key={cmd} style={{ marginBottom: 3 }}>{name} — <code style={{ color: '#10b981' }}>{cmd}</code></li>
                        ))}
                      </ul>
                      <div style={{ marginTop: 10, background: 'rgba(212,160,67,0.08)', border: '1px solid rgba(212,160,67,0.2)', borderRadius: 5, padding: '7px 10px', fontSize: 10, color: '#d4a043' }}>
                        export ANTHROPIC_API_KEY=sk-ant-...
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0a0a0a' }}>
              <TerminalPane
                ref={termRef}
                sessionId={session.sessionId}
                wsUrl={session.wsUrl}
                initialFontSize={fontSize}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── Idle: two-column layout ── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Left panel: environment info + launch */}
            <div style={{
              width: 280,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              background: '#111827',
              borderRight: '1px solid rgba(255,255,255,0.07)',
              overflowY: 'auto',
            }}>
              {/* Header */}
              <div style={{ padding: '20px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>⌨️</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Playground</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10b981' }}>
                    BETA
                  </span>
                </div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Disposable Linux VMs — start in seconds, no setup required.
                </p>
              </div>

              {/* Terminal preview thumbnail */}
              <div style={{ margin: '0 16px 16px' }}>
                <div style={{
                  height: 100,
                  borderRadius: 8,
                  background: '#0a0a0a',
                  border: `2px solid ${selectedEnv.color}44`,
                  borderTop: `3px solid ${selectedEnv.color}`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px 10px',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 10,
                  color: '#e4e4e4',
                }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                  </div>
                  <div style={{ color: '#10b981' }}>
                    root@{selectedEnv.id}:~$ <span style={{ animation: 'blink 1s step-end infinite' }}>▊</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', marginTop: 4, fontSize: 9 }}>
                    {selectedEnv.desc}
                  </div>
                </div>
              </div>

              {/* Selected env info */}
              <div style={{ padding: '0 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 18, display: "flex", alignItems: "center" }}><EnvIcon icon={selectedEnv.icon} /></span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{selectedEnv.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                  {selectedEnv.category.split(' · ').map((cat) => (
                    <span key={cat} style={{
                      fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                      background: `${selectedEnv.color}22`, color: selectedEnv.color,
                    }}>
                      {cat}
                    </span>
                  ))}
                  {selectedEnv.plan === 'free' && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                      Free
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>
                  {selectedEnv.desc}
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 16px 16px' }} />

              {/* Session config */}
              <div style={{ padding: '0 16px', marginBottom: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
                  Session config
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    ['Duration', '30 min'],
                    ['Login as', 'root'],
                    ['Network', 'US East'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{k}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontFamily: '"IBM Plex Mono", monospace' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />
            </div>

            {/* Right panel: environment card grid + centered Start button below */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#0d1117', display: 'flex', flexDirection: 'column' }}>
              <EnvironmentPicker
                selected={environment}
                onChange={setEnvironment}
                userPlan={user?.plan_type}
                disabled={isCreating}
              />

              {/* Start button — centered below all env cards */}
              <div style={{ padding: '8px 24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {status === 'error' && error && (
                  <div style={{ width: '100%', maxWidth: 380, padding: '8px 12px', borderRadius: 6, fontSize: 11, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                    {error}
                  </div>
                )}
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => createSession(environment)}
                  style={{
                    width: '100%',
                    maxWidth: 380,
                    padding: '13px 0',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    background: isCreating ? 'rgba(212,160,67,0.5)' : '#d4a043',
                    color: '#1a1200',
                    border: 'none',
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    opacity: isCreating ? 0.85 : 1,
                    textTransform: 'uppercase',
                    boxShadow: isCreating ? 'none' : '0 0 24px rgba(212,160,67,0.25)',
                  }}
                >
                  {isCreating && (
                    <span style={{
                      width: 13, height: 13,
                      border: '2px solid currentColor',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                  )}
                  {isCreating ? 'Starting...' : 'Start Playground'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const tabBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '3px 8px',
  borderRadius: 5,
  fontSize: 11,
  fontWeight: 600,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.65)',
  cursor: 'pointer',
  userSelect: 'none',
};

const iconBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 6px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.55)',
  cursor: 'pointer',
  userSelect: 'none',
};
