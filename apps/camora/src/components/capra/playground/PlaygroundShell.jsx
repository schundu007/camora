import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaygroundSession } from '@/hooks/usePlaygroundSession';
import EnvironmentPicker from './EnvironmentPicker';
import SessionTimer from './SessionTimer';
import TerminalPane from './TerminalPane';

const INIT_STEPS = [
  'Allocating container',
  'Pulling environment image',
  'Starting shell process',
  'Opening terminal',
];

const InitProgress = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= INIT_STEPS.length - 1) return;
    const t = setTimeout(() => setStep(s => s + 1), 2800);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="flex flex-col items-center justify-center gap-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
      <div
        className="w-10 h-10 border-2 rounded-full animate-spin mb-2"
        style={{ borderColor: 'rgba(212,160,67,0.6)', borderTopColor: 'transparent' }}
      />
      <p className="text-sm font-semibold" style={{ color: '#e8c46a' }}>
        Warming up environment…
      </p>
      <div className="flex flex-col gap-1.5 min-w-[220px]">
        {INIT_STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            {i < step ? (
              <span style={{ color: '#10b981' }}>✓</span>
            ) : i === step ? (
              <span
                className="w-3 h-3 border rounded-full animate-spin inline-block"
                style={{ borderColor: 'rgba(212,160,67,0.7)', borderTopColor: 'transparent' }}
              />
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>○</span>
            )}
            <span style={{ color: i <= step ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
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
  const isActive = status === 'ready' && !!session;
  const isCreating = status === 'creating';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="page-wrap flex flex-col" style={{ height: 'calc(100vh - 60px)', minHeight: 0 }}>
      {/* Header */}
      <div
        className="cam-hero-strip flex items-center justify-between px-6 py-3 shrink-0"
        style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)',
          borderBottom: '1px solid var(--cam-gold-leaf-50, rgba(212,160,67,0.25))',
        }}
      >
        <div>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Playground
          </h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Live terminal sessions — Ubuntu, Docker, Kubernetes
          </p>
        </div>
        {isActive && (
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.35)',
              color: '#10b981',
            }}
          >
            Session active
          </span>
        )}
      </div>

      {/* Mobile guard */}
      {isMobile ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Playground requires a desktop browser with a keyboard.
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
              Please open Camora on a laptop or desktop to use the terminal.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Left sidebar */}
          <div
            className="flex flex-col gap-4 p-4 shrink-0"
            style={{
              width: 260,
              background: 'var(--bg-surface, #181c23)',
              borderRight: '1px solid var(--border)',
              overflowY: 'auto',
            }}
          >
            {!isActive ? (
              <EnvironmentPicker
                selected={environment}
                onChange={setEnvironment}
                userPlan={user?.plan_type}
                disabled={isCreating}
              />
            ) : (
              <SessionTimer
                timeRemaining={timeRemaining}
                extendAvailable={extendAvailable}
                onExtend={extendSession}
                onEnd={destroySession}
              />
            )}

            {!isActive && (
              <button
                type="button"
                disabled={isCreating}
                onClick={() => createSession(environment)}
                className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
                style={{
                  background: isCreating
                    ? 'rgba(212,160,67,0.5)'
                    : 'var(--cam-gold-leaf, #d4a043)',
                  color: '#1a1200',
                  border: 'none',
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  opacity: isCreating ? 0.8 : 1,
                }}
              >
                {isCreating && (
                  <span
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                  />
                )}
                {isCreating ? 'Starting...' : 'Start Session'}
              </button>
            )}

            {status === 'error' && error && (
              <div
                className="px-3 py-2 rounded-lg text-xs"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#fca5a5',
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Terminal area */}
          <div className="flex-1 min-w-0 min-h-0 flex items-center justify-center" style={{ background: '#0a0a0a', position: 'relative' }}>
            {isActive && session?.wsUrl ? (
              <TerminalPane
                sessionId={session.sessionId}
                wsUrl={session.wsUrl}
              />
            ) : isCreating ? (
              <InitProgress />
            ) : (
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {'>'}_
                </div>
                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Select an environment and start a session
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Sessions run for 30 minutes
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
