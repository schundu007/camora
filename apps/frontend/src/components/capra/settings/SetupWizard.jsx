import { useState } from 'react';
import ApiKeyInput from './ApiKeyInput';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [apiKeys, setApiKeys] = useState({
    anthropic: null,
    openai: null,
    hasAnthropic: false,
    hasOpenai: false,
  });
  const [error, setError] = useState(null);

  const handleSaveKey = async (provider, key) => {
    try {
      setApiKeys(prev => ({
        ...prev,
        [provider]: key,
        [`has${provider.charAt(0).toUpperCase() + provider.slice(1)}`]: !!key,
      }));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleComplete = async () => {
    if (!apiKeys.hasAnthropic && !apiKeys.hasOpenai) {
      setError('Please configure at least one API key to continue.');
      return;
    }
    onComplete();
  };

  const hasAtLeastOneKey = apiKeys.hasAnthropic || apiKeys.hasOpenai;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto py-8" style={{ background: 'var(--bg-elevated)' }}>
      <div className="w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-xl bg-[var(--accent)] flex items-center justify-center mb-6 mx-auto">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome to Capra</h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Let's get you set up with your AI providers</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-3 h-3 rounded-full" style={{ background: step >= 1 ? '#10b981' : '#e5e5e5' }} />
          <div className="w-24 h-1 rounded-full" style={{ background: step >= 2 ? '#10b981' : '#e5e5e5' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: step >= 2 ? '#10b981' : '#e5e5e5' }} />
        </div>

        {/* Content */}
        <div className="rounded-lg overflow-hidden shadow-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Configure API Keys</h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                Capra uses AI providers to solve coding problems. You'll need at least one API key to get started.
              </p>

              <div className="space-y-4">
                <ApiKeyInput
                  provider="anthropic"
                  currentKey={apiKeys.anthropic}
                  hasKey={apiKeys.hasAnthropic}
                  onSave={(key) => handleSaveKey('anthropic', key)}
                  onDelete={() => handleSaveKey('anthropic', null)}
                />
                <ApiKeyInput
                  provider="openai"
                  currentKey={apiKeys.openai}
                  hasKey={apiKeys.hasOpenai}
                  onSave={(key) => handleSaveKey('openai', key)}
                  onDelete={() => handleSaveKey('openai', null)}
                />
              </div>

              {error && (
                <div className="mt-4 px-4 py-3 rounded" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444' }}>
                  {error}
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!hasAtLeastOneKey}
                  className="px-6 py-3 text-sm font-semibold rounded transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#10b981', color: '#ffffff' }}
                >
                  Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: '#ecfdf5' }}>
                  <svg className="w-8 h-8" style={{ color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>You're all set!</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Capra is ready to help you solve coding problems.</p>
              </div>

              <div className="rounded-lg p-5 mb-8" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Quick Tips</h3>
                <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex items-start gap-2">
                    <span className="font-bold" style={{ color: '#10b981' }}>1.</span>
                    <span>Paste a problem description, screenshot, or URL to get started</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold" style={{ color: '#10b981' }}>2.</span>
                    <span>Toggle between Claude and GPT models in the header</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold" style={{ color: '#10b981' }}>3.</span>
                    <span>Access settings anytime from the sidebar</span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  className="px-6 py-3 text-sm font-semibold rounded transition-all flex items-center gap-2"
                  style={{ background: '#10b981', color: '#ffffff' }}
                >
                  Start Using Capra
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Need help? Visit our <a href="https://github.com/your-repo/chundu" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981' }}>documentation</a>
        </div>
      </div>
    </div>
  );
}
