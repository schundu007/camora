import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SiteNav from '../../components/shared/SiteNav';
import SiteFooter from '../../components/shared/SiteFooter';
import SEO from '../../components/shared/SEO';
import { isOwner } from '../../lib/owner';

const API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

const PROVIDERS = ['gemini', 'anthropic', 'deepseek', 'openrouter'] as const;
type ProviderKey = typeof PROVIDERS[number];

const PROVIDER_LABELS: Record<ProviderKey, string> = {
  gemini: 'Gemini',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
};

interface ProviderStatus {
  provider: ProviderKey;
  configured: boolean;
  source: 'db' | 'env' | 'none';
  masked: string | null;
}

interface ProviderCardState {
  inputKey: string;
  saving: boolean;
  saved: boolean;
  clearing: boolean;
}

export default function AdminApiKeysPage() {
  const { token, user } = useAuth();
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [primaryProvider, setPrimaryProvider] = useState<ProviderKey>('gemini');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardState, setCardState] = useState<Record<ProviderKey, ProviderCardState>>(() =>
    Object.fromEntries(
      PROVIDERS.map((p) => [p, { inputKey: '', saving: false, saved: false, clearing: false }])
    ) as Record<ProviderKey, ProviderCardState>
  );
  const [primarySaving, setPrimarySaving] = useState(false);

  useEffect(() => { document.title = 'API Keys — Camora Admin'; }, []);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/admin/api-keys`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (res.status === 403) { setError('Admin access required'); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProviders(data.providers ?? []);
      setPrimaryProvider(data.primaryProvider ?? 'gemini');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const updateCardState = (provider: ProviderKey, patch: Partial<ProviderCardState>) => {
    setCardState((prev) => ({ ...prev, [provider]: { ...prev[provider], ...patch } }));
  };

  const handleSaveKey = async (provider: ProviderKey) => {
    const key = cardState[provider].inputKey.trim();
    if (!key) return;
    updateCardState(provider, { saving: true });
    try {
      const res = await fetch(`${API}/api/v1/admin/api-keys`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ provider, apiKey: key }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      updateCardState(provider, { saving: false, saved: true, inputKey: '' });
      setTimeout(() => updateCardState(provider, { saved: false }), 3000);
      fetchStatus();
    } catch {
      updateCardState(provider, { saving: false });
    }
  };

  const handleClearKey = async (provider: ProviderKey) => {
    updateCardState(provider, { clearing: true });
    try {
      const res = await fetch(`${API}/api/v1/admin/api-keys`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ provider, apiKey: '' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      updateCardState(provider, { clearing: false });
      fetchStatus();
    } catch {
      updateCardState(provider, { clearing: false });
    }
  };

  const handlePrimaryChange = async (value: ProviderKey) => {
    setPrimaryProvider(value);
    setPrimarySaving(true);
    try {
      await fetch(`${API}/api/v1/admin/api-keys`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ primaryProvider: value }),
      });
    } finally {
      setPrimarySaving(false);
    }
  };

  if (!isOwner(user)) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
        <SiteNav variant="light" />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold mb-2">Admin only</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>This page is restricted to operators.</p>
            <Link to="/" className="inline-block mt-4 px-4 py-2 text-sm font-bold rounded-lg text-white" style={{ background: 'var(--accent)' }}>Back to home</Link>
          </div>
        </main>
        <SiteFooter variant="light" />
      </div>
    );
  }

  const sourceLabel = (source: ProviderStatus['source']) => {
    if (source === 'db') return <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#d1fae5', color: '#065f46' }}>DB Override</span>;
    if (source === 'env') return <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#dbeafe', color: '#1e40af' }}>From Env</span>;
    return <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fee2e2', color: '#991b1b' }}>Not Set</span>;
  };

  const providerMap = Object.fromEntries(providers.map((p) => [p.provider, p])) as Record<ProviderKey, ProviderStatus | undefined>;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
      <SEO title="API Keys — Admin" noIndex />
      <SiteNav variant="light" />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">AI Provider Keys</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage API keys and primary provider for live inference. DB overrides take effect immediately; no redeploy needed.</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm font-medium" style={{ background: '#fee2e2', color: '#991b1b' }}>
            {error}
            <button onClick={fetchStatus} className="ml-3 underline">Retry</button>
          </div>
        )}

        <div className="mb-8 p-5 rounded-xl border" style={{ background: 'var(--bg-card, var(--bg-surface))', borderColor: 'var(--border-subtle, #e5e7eb)' }}>
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold min-w-[140px]" htmlFor="primary-provider">Primary Provider</label>
            <select
              id="primary-provider"
              value={primaryProvider}
              onChange={(e) => handlePrimaryChange(e.target.value as ProviderKey)}
              disabled={primarySaving || loading}
              className="text-sm rounded-lg px-3 py-2 border font-medium"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-primary)', borderColor: 'rgba(255,255,255,0.15)' }}
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
              ))}
            </select>
            {primarySaving && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Saving…</span>}
            <p className="text-xs ml-auto" style={{ color: 'var(--text-secondary)' }}>Fallback chain tries remaining providers in order on error.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-sm py-8 text-center" style={{ color: 'var(--text-secondary)' }}>Loading provider status…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PROVIDERS.map((provider) => {
              const status = providerMap[provider];
              const state = cardState[provider];
              const configured = status?.configured ?? false;

              return (
                <div key={provider} className="p-5 rounded-xl border" style={{ background: 'var(--bg-card, var(--bg-surface))', borderColor: 'var(--border-subtle, #e5e7eb)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: configured ? '#10b981' : '#ef4444' }}
                    />
                    <span className="font-bold text-[15px]">{PROVIDER_LABELS[provider]}</span>
                    {provider === primaryProvider && (
                      <span className="text-[12px] font-bold px-1.5 py-0.5 rounded ml-1" style={{ background: 'var(--accent)', color: '#fff' }}>PRIMARY</span>
                    )}
                    <span className="ml-auto">{status ? sourceLabel(status.source) : sourceLabel('none')}</span>
                  </div>

                  {status?.masked && (
                    <div className="mb-3 font-mono text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      {status.masked}
                    </div>
                  )}

                  <div className="flex gap-2 mb-2">
                    <input
                      type="password"
                      placeholder="Enter new key…"
                      value={state.inputKey}
                      onChange={(e) => updateCardState(provider, { inputKey: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveKey(provider)}
                      className="flex-1 text-sm rounded-lg px-3 py-2 border font-mono placeholder:opacity-40"
                      style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-primary)', borderColor: 'rgba(255,255,255,0.15)' }}
                    />
                    <button
                      onClick={() => handleSaveKey(provider)}
                      disabled={!state.inputKey.trim() || state.saving}
                      className="px-4 py-2 text-sm font-bold rounded-lg text-white disabled:opacity-40"
                      style={{ background: 'var(--accent)' }}
                    >
                      {state.saving ? '…' : state.saved ? 'Saved!' : 'Save'}
                    </button>
                  </div>

                  {status?.source === 'db' && (
                    <button
                      onClick={() => handleClearKey(provider)}
                      disabled={state.clearing}
                      className="text-xs font-medium underline"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {state.clearing ? 'Clearing…' : 'Clear DB override (revert to env)'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter variant="light" />
    </div>
  );
}
