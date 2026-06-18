import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaygroundSession } from '@/hooks/usePlaygroundSession';
import { useDialog } from '@/components/shared/Dialog';
import EnvironmentPicker, { ENVIRONMENTS } from './EnvironmentPicker';
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
          {/* ── Active: compact tab bar ── */}
          <div style={{
            flexShrink: 0,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            background: '#161b22',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            {/* Left: terminal tab */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block',
                  boxShadow: '0 0 6px #10b981',
                }} />
                Term 1
              </div>
            </div>

            {/* Right: timer + controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Timer */}
              <span style={{
                fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
                fontSize: 12,
                fontWeight: 700,
                color: timerColor,
                padding: '3px 8px',
                borderRadius: 4,
                background: isRed ? 'rgba(239,68,68,0.12)' : isAmber ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isRed ? 'rgba(239,68,68,0.3)' : isAmber ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}`,
                animation: isRed ? 'pulse 1s ease-in-out infinite' : undefined,
              }}>
                ⏱ {timerStr}
              </span>

              {/* Font controls */}
              <div style={{ display: 'flex', gap: 2 }}>
                {[['A−', handleFontDec], ['A+', handleFontInc]].map(([label, fn]) => (
                  <button key={label} type="button" onClick={fn} style={tabBtn}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Instructions toggle */}
              <button
                type="button"
                onClick={() => setShowInstructions((v) => !v)}
                style={{ ...tabBtn, background: showInstructions ? 'rgba(212,160,67,0.15)' : tabBtn.background, color: showInstructions ? '#d4a043' : tabBtn.color, borderColor: showInstructions ? 'rgba(212,160,67,0.4)' : tabBtn.borderColor }}
                title="Toggle instructions"
              >
                ?
              </button>

              {/* Extend */}
              {extendAvailable && (
                <button type="button" onClick={extendSession} style={{ ...tabBtn, color: '#d4a043', borderColor: 'rgba(212,160,67,0.4)' }}>
                  +15m
                </button>
              )}

              {/* End */}
              <button type="button" onClick={handleEnd} style={{ ...tabBtn, color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}>
                End
              </button>
            </div>
          </div>

          {/* ── Active: terminal + optional instructions panel ── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0a0a0a' }}>
              <TerminalPane
                ref={termRef}
                sessionId={session.sessionId}
                wsUrl={session.wsUrl}
                initialFontSize={fontSize}
              />
            </div>

            {showInstructions && (
              <div style={{
                width: 300,
                flexShrink: 0,
                background: '#111827',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                overflowY: 'auto',
                padding: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                    {selectedEnv.icon} {selectedEnv.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowInstructions(false)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, padding: 0 }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                  <p style={{ marginBottom: 12, color: 'rgba(255,255,255,0.45)' }}>{selectedEnv.desc}</p>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#10b981', marginBottom: 12 }}>
                    $ whoami{'\n'}root
                  </div>
                  <p style={{ marginBottom: 8 }}>This is a live Linux VM session. Your session runs for 30 minutes. Use the timer to track remaining time.</p>
                  {selectedEnv.id === 'agent-sandbox' && (
                    <>
                      <p style={{ fontWeight: 700, color: '#fff', marginBottom: 6 }}>Pre-installed agents:</p>
                      <ul style={{ margin: 0, paddingLeft: 16, color: 'rgba(255,255,255,0.6)' }}>
                        <li>Claude Code — <code style={{ color: '#10b981' }}>claude</code></li>
                        <li>OpenAI Codex — <code style={{ color: '#10b981' }}>codex</code></li>
                        <li>Gemini CLI — <code style={{ color: '#10b981' }}>gemini</code></li>
                      </ul>
                      <div style={{ marginTop: 12, background: 'rgba(212,160,67,0.08)', border: '1px solid rgba(212,160,67,0.25)', borderRadius: 6, padding: '8px 12px', fontSize: 10, color: '#d4a043' }}>
                        Set your API keys before running an agent: export ANTHROPIC_API_KEY=...
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
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
                  <span style={{ fontSize: 18 }}>{selectedEnv.icon}</span>
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

              {/* Launch button */}
              <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {status === 'error' && error && (
                  <div style={{ padding: '8px 10px', borderRadius: 6, fontSize: 11, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: 4 }}>
                    {error}
                  </div>
                )}
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => createSession(environment)}
                  style={{
                    width: '100%',
                    padding: '11px 0',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '0.03em',
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

            {/* Right panel: environment card grid */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#0d1117' }}>
              <EnvironmentPicker
                selected={environment}
                onChange={setEnvironment}
                userPlan={user?.plan_type}
                disabled={isCreating}
              />
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
