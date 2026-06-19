import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaygroundSession } from '@/hooks/usePlaygroundSession';
import { useDialog } from '@/components/shared/Dialog';
import EnvironmentPicker, { ENVIRONMENTS, EnvIcon } from './EnvironmentPicker';
import TerminalPane from './TerminalPane';
import BootProgress from './BootProgress';
import IdePane from './IdePane';
import RadarPane from './RadarPane';
import ToolPickerPanel from './ToolPickerPanel';
import SavedVmsPanel from './SavedVmsPanel';
import ClusterView from './ClusterView';


function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '60:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PlaygroundShell() {
  const { user } = useAuth();
  const { confirm, alert: dialogAlert } = useDialog();
  const {
    session, status, error, timeRemaining, bootSteps, extendAvailable,
    wsUrl, ideUrl, radarUrl,
    createSession, destroySession, extendSession,
    saves, savesLoading, slotsUsed, slotsMax, saveVm, restoreVm, deleteSave,
  } = usePlaygroundSession();

  const [environment, setEnvironment] = useState('ubuntu');
  const [fontSize, setFontSize] = useState(13);
  const [activeTab, setActiveTab] = useState('terminal');
  const [termKey, setTermKey] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [toolPickerOpen, setToolPickerOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const termRef = useRef(null);

  const isActive = status === 'ready' && !!session;
  const isCreating = status === 'creating';
  const isBooting = status === 'booting';
  const isLoading = isCreating || isBooting;
  const isMobile = false;

  const showTerminal = isActive && !minimized;
  const showIdle = !isLoading && (!isActive || minimized);

  const selectedEnv = ENVIRONMENTS.find((e) => e.id === environment) || ENVIRONMENTS[0];
  const activeEnv = session?.environment
    ? (ENVIRONMENTS.find(e => e.id === session.environment) || selectedEnv)
    : selectedEnv;

  const timerStr = formatTime(timeRemaining);
  const isAmber = timeRemaining > 0 && timeRemaining < 300;
  const isRed = timeRemaining > 0 && timeRemaining < 60;
  const timerColor = isRed ? '#ef4444' : isAmber ? '#f59e0b' : 'rgba(255,255,255,0.5)';

  const CLUSTER_STEP_LABELS = {
    container_ready: 'Provisioning 3 nodes...',
    env_setup:       'Configuring etcd cluster...',
    ide_start:       'Starting code editor...',
    terminal_ready:  'Cluster ready — 3 nodes online',
  };

  const isClusterEnv = !!session?.isCluster;
  const displaySteps = isClusterEnv
    ? bootSteps.map(s =>
        CLUSTER_STEP_LABELS[s.step]
          ? { ...s, label: CLUSTER_STEP_LABELS[s.step] }
          : s
      )
    : bootSteps;

  const isClusterSession = !!session?.isCluster;

  const handleEnd = useCallback(async () => {
    const ok = await confirm({ message: 'End session? The container will be destroyed.', tone: 'danger' });
    if (ok) destroySession(); // destroySession navigates to /playground?tab=vm automatically
  }, [confirm, destroySession]);

  const handleFontInc = useCallback(() => {
    setFontSize(f => { const n = Math.min(18, f + 1); termRef.current?.setFontSize(n); return n; });
  }, []);
  const handleFontDec = useCallback(() => {
    setFontSize(f => { const n = Math.max(10, f - 1); termRef.current?.setFontSize(n); return n; });
  }, []);

  const handleSaveVm = useCallback(async () => {
    if (!saveName.trim() || !session) return;
    setSaving(true); setSaveError(null);
    try {
      await saveVm(session.sessionId, saveName.trim());
      setSaveDialogOpen(false); setSaveName('');
    } catch (err) { setSaveError(err.message); }
    setSaving(false);
  }, [saveName, session, saveVm]);

  const handleRestoreVm = useCallback(async (saveId) => {
    setRestoringId(saveId); setMinimized(false);
    try { await restoreVm(saveId); } catch (err) { dialogAlert(err.message); }
    setRestoringId(null);
  }, [restoreVm, dialogAlert]);

  const handleDeleteSave = useCallback(async (saveId) => {
    const ok = await confirm({ message: 'Delete this saved VM? This cannot be undone.', tone: 'danger' });
    if (!ok) return;
    try { await deleteSave(saveId); } catch {}
  }, [confirm, deleteSave]);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* ── BOOTING / CREATING state ── */}
      {isLoading && (
        <>
          {/* Minimal title bar */}
          <div style={{
            flexShrink: 0, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 10px', background: '#0d1117',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 3 }}>⌨</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Camora Playground</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.2)',
                borderTopColor: 'rgba(255,255,255,0.6)',
                animation: 'spin 1s linear infinite',
              }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                {isCreating ? 'Provisioning...' : 'Starting environment...'}
              </span>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <BootProgress steps={displaySteps} totalSteps={4} environment={activeEnv.id} />
          </div>
        </>
      )}

      {/* ── ACTIVE state ── */}
      {showTerminal && (
        <>
          {/* Single compact bar: env + tabs + controls */}
          <div style={{
            flexShrink: 0, height: 32,
            display: 'flex', alignItems: 'center',
            padding: '0 8px', gap: 6,
            background: '#0d1117',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            {/* Env label */}
            <span style={{ fontSize: 10, fontFamily: '"IBM Plex Mono", monospace', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {activeEnv.label}
            </span>
            <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
            {/* Tabs */}
            <TabButton active={activeTab === 'ide'} onClick={() => setActiveTab('ide')} label="IDE" icon="⌥" />
            <TabButton
              active={activeTab === 'terminal'}
              onClick={() => setActiveTab('terminal')}
              label={activeEnv.id === 'ubuntu' ? 'ubuntu-01' : activeEnv.id === 'docker' ? 'docker-01' : activeEnv.id === 'agent-sandbox' ? 'agent-01' : activeEnv.id === 'k8s-etcd' ? 'etcd-01' : 'shell-01'}
              icon="$"
              mono
              onReconnect={activeTab === 'terminal' ? () => setTermKey(k => k + 1) : null}
            />
            {radarUrl && (
              <TabButton active={activeTab === 'radar'} onClick={() => setActiveTab('radar')} label="Radar" icon="◎" />
            )}
            <div style={{ flex: 1 }} />
            {/* Controls */}
            {activeTab === 'terminal' && [['A−', handleFontDec], ['A+', handleFontInc]].map(([label, fn]) => (
              <button key={label} type="button" onClick={fn} style={iconBtn}>{label}</button>
            ))}
            {extendAvailable && (
              <button type="button" onClick={extendSession} style={{ ...iconBtn, color: '#d4a043' }}>+15m</button>
            )}
            <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 4px #10b981', flexShrink: 0 }} />
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 700, color: timerColor, flexShrink: 0,
              animation: isRed ? 'pulse 1s ease-in-out infinite' : undefined,
            }}>{timerStr}</span>
            <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
            <button type="button" onClick={() => setMinimized(true)} style={iconBtn} title="Back to picker">‹ Exit</button>
            {slotsMax > 0 && (
              <button type="button" onClick={() => setSaveDialogOpen(true)} style={{ ...iconBtn, color: '#d4a043' }}>Save VM</button>
            )}
            <button type="button" onClick={handleEnd} style={{ ...iconBtn, color: '#ef4444', padding: '3px 8px' }} title="End session">■</button>
          </div>

          {/* Content pane */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {isClusterSession ? (
              /* Cluster view — replaces single IDE + terminal tabs */
              <div style={{ position: 'absolute', inset: 0 }}>
                <ClusterView session={session} onClose={() => setMinimized(true)} />
              </div>
            ) : (
              <>
                {/* IDE pane */}
                <div style={{ position: 'absolute', inset: 0, display: activeTab === 'ide' ? 'block' : 'none' }}>
                  <IdePane ideUrl={ideUrl} wsUrl={wsUrl} />
                </div>
                {/* Terminal pane */}
                <div style={{ position: 'absolute', inset: 0, display: activeTab === 'terminal' ? 'block' : 'none', background: '#0a0a0a' }}>
                  {wsUrl && (
                    <TerminalPane
                      key={termKey}
                      ref={termRef}
                      wsUrl={wsUrl}
                      initialFontSize={fontSize}
                      onExit={destroySession}
                    />
                  )}
                </div>
                {/* Radar pane — k8s environments only */}
                {radarUrl && (
                  <div style={{ position: 'absolute', inset: 0, display: activeTab === 'radar' ? 'block' : 'none' }}>
                    <RadarPane radarUrl={radarUrl} />
                  </div>
                )}
              </>
            )}
          </div>
          {saveDialogOpen && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div style={{ width: 360, background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Save VM Snapshot</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
                  Saves your container state to cloud storage. Takes 1–3 minutes. Restore any time to continue where you left off.
                </div>
                <input
                  autoFocus type="text" placeholder="e.g. My Python setup"
                  value={saveName} onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveVm(); if (e.key === 'Escape') setSaveDialogOpen(false); }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', marginBottom: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }}
                />
                {saveError && <div style={{ fontSize: 11, color: '#fca5a5', marginBottom: 8 }}>{saveError}</div>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setSaveDialogOpen(false); setSaveName(''); setSaveError(null); }} style={iconBtn}>Cancel</button>
                  <button type="button" disabled={saving || !saveName.trim()} onClick={handleSaveVm} style={{ padding: '4px 14px', borderRadius: 5, fontSize: 12, fontWeight: 700, background: saving ? 'rgba(212,160,67,0.4)' : '#d4a043', color: '#1a1200', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
                    {saving ? 'Saving...' : 'Save VM'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── IDLE / MINIMIZED state ── */}
      <ToolPickerPanel
        open={toolPickerOpen}
        onClose={() => setToolPickerOpen(false)}
        disabled={isLoading}
        onStart={(setupScript) => {
          setToolPickerOpen(false);
          createSession('ubuntu', null, setupScript);
        }}
      />

      {showIdle && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left panel */}
          <div style={{
            width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
            background: 'var(--bg-elevated)', borderRight: '1px solid var(--border)', overflowY: 'auto',
          }}>
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>⌨️</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Playground</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10b981' }}>BETA</span>
              </div>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
                Disposable Linux VMs with VS Code IDE — start in seconds.
              </p>
            </div>
            <div style={{ margin: '0 16px 16px' }}>
              <div style={{
                height: 100, borderRadius: 8, background: '#0a0a0a',
                border: `2px solid ${selectedEnv.color}44`, borderTop: `3px solid ${selectedEnv.color}`,
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
                padding: '8px 10px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#e4e4e4',
              }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                </div>
                <div style={{ color: '#10b981' }}>root@{selectedEnv.id}:~$ <span style={{ animation: 'pulse 1.2s step-end infinite' }}>▊</span></div>
                <div style={{ color: 'rgba(255,255,255,0.25)', marginTop: 4, fontSize: 9 }}>{selectedEnv.desc}</div>
              </div>
            </div>
            <div style={{ padding: '0 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 18, display: 'flex', alignItems: 'center' }}><EnvIcon icon={selectedEnv.icon} /></span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedEnv.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {selectedEnv.category.split(' · ').map(cat => (
                  <span key={cat} style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: `${selectedEnv.color}22`, color: selectedEnv.color }}>{cat}</span>
                ))}
                {selectedEnv.plan === 'free' && (
                  <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Free</span>
                )}
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '0 16px 12px' }} />
            <div style={{ padding: '0 16px', marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>Included</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[['Terminal', 'bash shell'], ['IDE', 'VS Code in browser'], ['Duration', '60 min']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{k}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)', fontFamily: '"IBM Plex Mono", monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }} />
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
            {/* Resume banner when a session is still running */}
            {isActive && minimized && (
              <div style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 16px', background: 'rgba(16,185,129,0.08)',
                borderBottom: '1px solid rgba(16,185,129,0.2)',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 5px #10b981', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', flex: 1 }}>
                  Session still running — <span style={{ fontFamily: '"IBM Plex Mono", monospace', color: timerColor, fontWeight: 700 }}>{timerStr}</span> remaining
                </span>
                <button
                  type="button"
                  onClick={() => setMinimized(false)}
                  style={{ ...iconBtn, color: '#10b981', border: '1px solid rgba(16,185,129,0.35)' }}
                >
                  ↩ Resume
                </button>
                <button
                  type="button"
                  onClick={handleEnd}
                  style={{ ...iconBtn, color: '#f87171' }}
                >
                  ⏻ End
                </button>
              </div>
            )}
            <EnvironmentPicker selected={environment} onChange={setEnvironment} userPlan={user?.plan_type} disabled={isLoading} />
            <SavedVmsPanel
              saves={saves} slotsUsed={slotsUsed} slotsMax={slotsMax}
              savesLoading={savesLoading} onRestore={handleRestoreVm}
              onDelete={handleDeleteSave} restoringId={restoringId}
            />
            <div style={{ padding: '8px 24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {status === 'error' && error && (
                <div style={{ width: '100%', maxWidth: 380, padding: '8px 12px', borderRadius: 6, fontSize: 11, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                  {error}
                </div>
              )}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  if (isActive && minimized) { setMinimized(false); return; }
                  if (environment === 'custom') { setToolPickerOpen(true); return; }
                  createSession(environment);
                }}
                style={{
                  width: '100%', maxWidth: 380, padding: '13px 0', borderRadius: 8,
                  fontSize: 13, fontWeight: 800, letterSpacing: '0.04em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  background: isLoading ? 'rgba(212,160,67,0.5)' : '#d4a043', color: '#1a1200',
                  border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.85 : 1, textTransform: 'uppercase',
                  boxShadow: isLoading ? 'none' : '0 0 24px rgba(212,160,67,0.25)',
                }}
              >
                {isActive && minimized ? '↩ Resume Session' : 'Start Playground'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, icon, mono, onReconnect }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 8px 3px 10px', borderRadius: onReconnect ? '6px 0 0 6px' : 6,
          background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
          fontSize: 12, fontWeight: 600, color: active ? '#fff' : 'rgba(255,255,255,0.45)',
          fontFamily: mono ? '"IBM Plex Mono", monospace' : 'inherit',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />}
        <span style={{ fontSize: icon === '$' ? 11 : 12 }}>{icon}</span>
        <span>{label}</span>
      </button>
      {onReconnect && (
        <button
          type="button"
          onClick={onReconnect}
          title="Reconnect terminal"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: '100%', padding: '3px 0',
            borderRadius: '0 6px 6px 0',
            background: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
            borderLeft: 'none',
            color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 11,
          }}
        >↻</button>
      )}
    </div>
  );
}

const iconBtn = {
  display: 'inline-flex', alignItems: 'center',
  padding: '4px 10px', borderRadius: 5, fontSize: 13, fontWeight: 600,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.65)', cursor: 'pointer', userSelect: 'none',
};
