import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaygroundSession } from '@/hooks/usePlaygroundSession';
import EnvironmentPicker from './EnvironmentPicker';
import SessionTimer from './SessionTimer';
import TerminalPane from './TerminalPane';

const ENV_LABELS = {
  ubuntu: 'Ubuntu 24.04',
  docker: 'Docker',
  'agent-sandbox': 'AI Agent Sandbox',
  'k8s-single': 'K8s Single-node',
  'k8s-multi': 'K8s Multi-node',
  'cloud-cli': 'Cloud CLI',
};

export default function PlaygroundShell() {
  const { user } = useAuth();
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
  const termRef = useRef(null);

  const isActive = status === 'ready' && !!session;
  const isCreating = status === 'creating';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const mins = timeRemaining != null ? Math.floor(timeRemaining / 60) : 0;
  const secs = timeRemaining != null ? timeRemaining % 60 : 0;
  const timerStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const handleClear = useCallback(() => termRef.current?.clear(), []);
  const handleCopyAll = useCallback(() => termRef.current?.copyAll(), []);
  const handleFontInc = useCallback(() => {
    setFontSize((f) => {
      const next = Math.min(18, f + 1);
      termRef.current?.setFontSize(next);
      return next;
    });
  }, []);
  const handleFontDec = useCallback(() => {
    setFontSize((f) => {
      const next = Math.max(10, f - 1);
      termRef.current?.setFontSize(next);
      return next;
    });
  }, []);
  const handleFullscreen = useCallback(() => termRef.current?.requestFullscreen(), []);

  const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.7)',
    userSelect: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          background: '#0a1628',
          borderBottom: '1px solid rgba(212,160,67,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⌨️</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              Terminal Playground
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
              Live terminal sessions — Ubuntu, Docker, Kubernetes
            </div>
          </div>
          {isActive && (
            <span
              style={{
                marginLeft: 8,
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                background: 'rgba(212,160,67,0.12)',
                border: '1px solid rgba(212,160,67,0.35)',
                color: '#d4a043',
              }}
            >
              {ENV_LABELS[environment] || environment}
            </span>
          )}
        </div>
        {isActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.35)',
                color: '#10b981',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block',
                  animation: 'pulse 2s infinite',
                }}
              />
              Live · {timerStr}
            </span>
            <button
              type="button"
              onClick={destroySession}
              style={{
                padding: '3px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                background: 'transparent',
                border: '1px solid rgba(239,68,68,0.5)',
                color: '#f87171',
                cursor: 'pointer',
              }}
            >
              End Session
            </button>
          </div>
        )}
      </div>

      {/* Mobile guard */}
      {isMobile ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              Playground requires a desktop browser with a keyboard.
            </p>
            <p style={{ fontSize: 13, marginTop: 8, color: 'var(--text-secondary)' }}>
              Please open Camora on a laptop or desktop to use the terminal.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div
            style={{
              width: 260,
              flexShrink: 0,
              overflowY: 'auto',
              background: '#111827',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 14,
            }}
          >
            {!isActive ? (
              <>
                <EnvironmentPicker
                  selected={environment}
                  onChange={setEnvironment}
                  userPlan={user?.plan_type}
                  disabled={isCreating}
                />
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => createSession(environment)}
                  style={{
                    width: '100%',
                    padding: '9px 0',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    background: isCreating ? 'rgba(212,160,67,0.5)' : '#d4a043',
                    color: '#1a1200',
                    border: 'none',
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    opacity: isCreating ? 0.8 : 1,
                  }}
                >
                  {isCreating && (
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        border: '2px solid currentColor',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                  )}
                  {isCreating ? 'Starting...' : 'Start Session'}
                </button>
                {status === 'error' && error && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#fca5a5',
                    }}
                  >
                    {error}
                  </div>
                )}
              </>
            ) : (
              <SessionTimer
                timeRemaining={timeRemaining}
                extendAvailable={extendAvailable}
                onExtend={extendSession}
                onEnd={destroySession}
              />
            )}
          </div>

          {/* Terminal column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0a0a' }}>
            {isActive && (
              /* Toolbar */
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 12px',
                  background: '#111',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" style={chipStyle} onClick={handleCopyAll} title="Copy all output">
                    ⎘ Copy
                  </button>
                  <button type="button" style={chipStyle} onClick={handleClear} title="Clear terminal">
                    ✕ Clear
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginRight: 2 }}>
                    {fontSize}px
                  </span>
                  <button type="button" style={{ ...chipStyle, padding: '2px 6px' }} onClick={handleFontDec} title="Decrease font size">
                    A−
                  </button>
                  <button type="button" style={{ ...chipStyle, padding: '2px 6px' }} onClick={handleFontInc} title="Increase font size">
                    A+
                  </button>
                  <button type="button" style={{ ...chipStyle, marginLeft: 4 }} onClick={handleFullscreen} title="Fullscreen">
                    ⛶
                  </button>
                </div>
              </div>
            )}

            {/* Terminal area */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {isActive && session?.wsUrl ? (
                <TerminalPane
                  ref={termRef}
                  sessionId={session.sessionId}
                  wsUrl={session.wsUrl}
                  initialFontSize={fontSize}
                />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 16,
                        margin: '0 auto 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.4)',
                      }}
                    >
                      &gt;_
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                      Select an environment and start a session
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>
                      Sessions run for 30 minutes
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
