import { useState, useEffect } from 'react';
import { getToken } from '../../../utils/authHeaders.js';
const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
const isElectron = false; // Electron removed in unified frontend

// Platform categories - using initials instead of generic icons
const CODING_PLATFORMS = {
  hackerrank: { name: 'HackerRank', color: '#1ba94c', url: 'hackerrank.com' },
  leetcode: { name: 'LeetCode', color: '#f97316', url: 'leetcode.com' },
  coderpad: { name: 'CoderPad', color: '#6366f1', url: 'coderpad.io' },
  codesignal: { name: 'CodeSignal', color: '#3b82f6', url: 'codesignal.com' },
};

const PREP_PLATFORMS = {
  techprep: { name: 'TechPrep', color: '#8b5cf6', url: 'techprep.app' },
  algomaster: { name: 'AlgoMaster', color: '#0D9488', url: 'algomaster.io' },
  neetcode: { name: 'NeetCode', color: '#f43f5e', url: 'neetcode.io' },
  designgurus: { name: 'DesignGurus', color: '#0ea5e9', url: 'designgurus.io' },
  educative: { name: 'Educative', color: '#22c55e', url: 'educative.io' },
  interviewbit: { name: 'InterviewBit', color: '#a855f7', url: 'interviewbit.com' },
  interviewingio: { name: 'Interviewing.io', color: '#4a90d9', url: 'interviewing.io', googleAuth: true },
  exponent: { name: 'Exponent', color: '#1a1a2e', url: 'tryexponent.com', googleAuth: true },
};

export default function PrepTab({ isOpen, onClose }) {
  // State for both webapp and desktop
  const [platformStatus, setPlatformStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(null);
  const [activeTab, setActiveTab] = useState('coding');
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchedContent, setFetchedContent] = useState(null);
  const [showExtensionInfo, setShowExtensionInfo] = useState(false);

  // Load platform status - works for both webapp and desktop
  useEffect(() => {
    if (!isOpen) return;

    async function loadStatus() {
      setLoading(true);

      if (isElectron && window.electronAPI?.getPlatformStatus) {
        // Desktop: get status from Electron
        try {
          const status = await window.electronAPI.getPlatformStatus();
          setPlatformStatus(status);
        } catch (err) {
          console.error('Failed to load platform status:', err);
        }
      } else {
        // Webapp: get status from backend (synced via extension)
        try {
          const token = getToken();
          const headers = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          const res = await fetch(API_URL + '/api/auth/status', { headers });
          if (res.ok) {
            const data = await res.json();
            setPlatformStatus(data);
          }
        } catch (err) {
          console.error('Failed to load platform status:', err);
        }
      }

      setLoading(false);
    }

    loadStatus();
  }, [isOpen]);

  const handleLogin = async (platform) => {
    if (!isElectron || !window.electronAPI?.platformLogin) return;

    setLoggingIn(platform);
    try {
      const result = await window.electronAPI.platformLogin(platform);
      if (result.success) {
        const status = await window.electronAPI.getPlatformStatus();
        setPlatformStatus(status);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setLoggingIn(null);
    }
  };

  const handleLogout = async (platform) => {
    if (!isElectron || !window.electronAPI?.platformLogout) return;

    try {
      await window.electronAPI.platformLogout(platform);
      const status = await window.electronAPI.getPlatformStatus();
      setPlatformStatus(status);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleRefreshStatus = async () => {
    if (isElectron) return;

    try {
      const token = getToken();
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(API_URL + '/api/auth/status', { headers });
      if (res.ok) {
        const data = await res.json();
        setPlatformStatus(data);
      }
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
  };

  const handleFetchContent = async () => {
    if (!fetchUrl.trim()) return;

    setFetching(true);
    setFetchedContent(null);

    try {
      const token = getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(API_URL + '/api/fetch', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: fetchUrl }),
      });

      const data = await res.json();
      if (data.success || data.problemText) {
        setFetchedContent({ success: true, title: data.title || 'Problem fetched!', text: data.problemText });
      } else {
        setFetchedContent({ error: data.error || 'Failed to fetch problem' });
      }
    } catch (err) {
      setFetchedContent({ error: 'Failed to fetch: ' + err.message });
    } finally {
      setFetching(false);
    }
  };

  const connectedCount = Object.values(platformStatus).filter(s => s?.authenticated).length;

  if (!isOpen) return null;

  const platforms = activeTab === 'coding' ? CODING_PLATFORMS : PREP_PLATFORMS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-2xl mx-4 rounded-lg overflow-hidden shadow-2xl border border-[var(--border)]" style={{ background: 'var(--bg-surface)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
            <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#ffffff' }}>Coding Platforms</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded" style={{ background: '#10b981', color: '#ffffff' }}>
              {connectedCount} connected
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded transition-colors hover:bg-[var(--bg-surface)]/10"
            style={{ color: '#94a3b8' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab('coding')}
            className="flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors"
            style={{
              color: activeTab === 'coding' ? '#10b981' : '#64748b',
              borderBottom: activeTab === 'coding' ? '2px solid #10b981' : '2px solid transparent',
              background: activeTab === 'coding' ? '#f0fdf4' : 'transparent',
            }}
          >
            Coding Platforms
          </button>
          <button
            onClick={() => setActiveTab('prep')}
            className="flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors"
            style={{
              color: activeTab === 'prep' ? '#10b981' : '#64748b',
              borderBottom: activeTab === 'prep' ? '2px solid #10b981' : '2px solid transparent',
              background: activeTab === 'prep' ? '#f0fdf4' : 'transparent',
            }}
          >
            Interview Prep Sites
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto bg-[var(--bg-elevated)]">
          {/* Browser Extension Notice - Webapp only */}
          {!isElectron && (
            <div className="mb-4 p-4 rounded-lg" style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#f59e0b' }}>
                  <svg className="w-4 h-4" style={{ color: '#ffffff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1" style={{ color: '#92400e' }}>Browser Extension Required</h3>
                  <p className="text-xs mb-2" style={{ color: '#b45309' }}>
                    Install the Ascend browser extension to sync your platform logins. The extension captures cookies from your logged-in sessions.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowExtensionInfo(!showExtensionInfo)}
                      className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
                      style={{ background: '#f59e0b', color: '#ffffff' }}
                    >
                      {showExtensionInfo ? 'Hide Instructions' : 'How to Install'}
                    </button>
                    <button
                      onClick={handleRefreshStatus}
                      className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
                      style={{ background: '#ffffff', color: '#92400e', border: '1px solid #fcd34d' }}
                    >
                      Refresh Status
                    </button>
                  </div>
                </div>
              </div>

              {showExtensionInfo && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid #fcd34d' }}>
                  <ol className="text-xs space-y-2" style={{ color: '#92400e' }}>
                    <li className="flex gap-2">
                      <span className="font-bold">1.</span>
                      <span>Download the extension folder from the project's <code className="px-1 py-0.5 rounded" style={{ background: '#fef3c7' }}>/extension</code> directory</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">2.</span>
                      <span>Open Chrome → Extensions → Enable "Developer mode"</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">3.</span>
                      <span>Click "Load unpacked" and select the extension folder</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">4.</span>
                      <span>Log into your coding platforms (HackerRank, LeetCode, etc.)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">5.</span>
                      <span>Click the extension icon and hit "Sync All" to sync your sessions</span>
                    </li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#10b981', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <>
              {/* Platform Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {Object.entries(platforms).map(([key, platform]) => {
                  const isAuthenticated = platformStatus[key]?.authenticated;
                  const isLoggingIn = loggingIn === key;
                  const initials = platform.name.split(/(?=[A-Z])/).map(w => w[0]).join('').slice(0, 2);

                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-lg transition-all border ${isAuthenticated ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--bg-surface)]'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded flex items-center justify-center text-white font-bold text-sm"
                            style={{ background: platform.color }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{platform.name}</div>
                            <div className="text-xs" style={{ color: isAuthenticated ? '#10b981' : 'var(--text-muted)' }}>
                              {isAuthenticated ? 'Connected' : 'Not connected'}
                            </div>
                          </div>
                        </div>

                        {/* Desktop: show login/logout buttons */}
                        {isElectron && (
                          isAuthenticated ? (
                            <button
                              onClick={() => handleLogout(key)}
                              className="px-2 py-1 text-xs font-medium rounded transition-colors"
                              style={{ color: '#ef4444', background: 'transparent' }}
                            >
                              Disconnect
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLogin(key)}
                              disabled={isLoggingIn}
                              className="px-2 py-1 text-xs font-medium rounded transition-colors disabled:opacity-50"
                              style={{ background: platform.color, color: '#ffffff' }}
                            >
                              {isLoggingIn ? '...' : 'Login'}
                            </button>
                          )
                        )}

                        {/* Webapp: show checkmark for connected */}
                        {!isElectron && isAuthenticated && (
                          <svg className="w-5 h-5" style={{ color: '#10b981' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fetch Content Section */}
              <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#475569' }}>
                  Fetch Problem by URL
                </h3>
                <div className="flex gap-2 mb-3">
                  <input
                    type="url"
                    value={fetchUrl}
                    onChange={(e) => setFetchUrl(e.target.value)}
                    placeholder="https://leetcode.com/problems/two-sum"
                    className="flex-1 px-3 py-2.5 text-sm rounded-lg"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={handleFetchContent}
                    disabled={fetching || !fetchUrl.trim()}
                    className="px-5 py-2.5 text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                    style={{ background: '#10b981', color: 'white' }}
                  >
                    {fetching ? 'Fetching...' : 'Fetch'}
                  </button>
                </div>

                {fetchedContent && (
                  <div
                    className="p-3 rounded-lg text-sm"
                    style={{
                      background: fetchedContent.error ? '#fef2f2' : '#ecfdf5',
                      border: fetchedContent.error ? '1px solid #fecaca' : '1px solid #a7f3d0'
                    }}
                  >
                    {fetchedContent.error ? (
                      <p style={{ color: '#dc2626' }}>{fetchedContent.error}</p>
                    ) : (
                      <>
                        <div className="font-medium mb-1" style={{ color: '#0D9488' }}>{fetchedContent.title}</div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Problem extracted! Close this and use the URL tab in Problem Input to solve it.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[var(--bg-elevated)] border-t border-[var(--border)]">
          <p className="text-xs text-center" style={{ color: '#64748b' }}>
            {isElectron
              ? 'Connect to platforms to auto-fetch problems • Sessions persist across restarts'
              : 'Install the browser extension to sync your platform logins and auto-fetch problems'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
