import { useState, useEffect } from 'react';
import ApiKeyInput from './ApiKeyInput';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

const CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Fast & capable' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most intelligent' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Previous gen' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fastest' },
];

const OPENAI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Fast & capable' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fastest' },
  { id: 'o1', name: 'o1', description: 'Reasoning model' },
  { id: 'o1-mini', name: 'o1-mini', description: 'Fast reasoning' },
  { id: 'o3-mini', name: 'o3-mini', description: 'Latest reasoning' },
];

export default function SettingsPanel({ onClose, provider, model, onProviderChange, onModelChange, onOpenPlatforms, autoSwitch, onAutoSwitchChange, editorSettings, onEditorSettingsChange }) {
  const tabs = [
    { id: 'ai', label: 'AI Provider', icon: 'sparkles' },
    { id: 'editor', label: 'Display', icon: 'code' },
  ];

  const [activeTab, setActiveTab] = useState('ai');
  const [showShortcuts, setShowShortcuts] = useState(false);

  const models = provider === 'openai' ? OPENAI_MODELS : CLAUDE_MODELS;

  const handleProviderSwitch = (newProvider) => {
    if (onProviderChange) {
      onProviderChange(newProvider);
      const defaultModel = newProvider === 'openai' ? OPENAI_MODELS[0].id : CLAUDE_MODELS[0].id;
      if (onModelChange) onModelChange(defaultModel);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const TabIcon = ({ name }) => {
    const icons = {
      sparkles: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />,
      code: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
    };
    return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icons[name]}</svg>;
  };

  const Toggle = ({ enabled, onChange }) => (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${enabled ? 'bg-emerald-500' : 'bg-[var(--bg-elevated)]'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-[var(--bg-surface)] shadow-md transition-all duration-200 ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl overflow-hidden w-full mx-6 border border-[var(--border)]/60"
        style={{ maxWidth: '640px', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 id="settings-dialog-title" className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Settings</h2>
              <p className="text-xs text-[var(--text-muted)]">Configure your workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-8 pt-4 gap-1 border-b border-[var(--border)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-emerald-700 border-emerald-500 bg-emerald-50/50'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <TabIcon name={tab.icon} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-8 py-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>

          {/* AI Provider Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* Provider */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 block">Provider</label>
                <div className="flex gap-3">
                  {[{ id: 'claude', label: 'Claude', sub: 'Anthropic' }, { id: 'openai', label: 'OpenAI', sub: 'GPT' }].map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleProviderSwitch(p.id)}
                      className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all border-2 ${
                        provider === p.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div>{p.label}</div>
                      <div className={`text-xs font-normal mt-0.5 ${provider === p.id ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`}>{p.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Models */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 block">Model</label>
                <div className="grid grid-cols-2 gap-3">
                  {models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onModelChange && onModelChange(m.id)}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-all border-2 ${
                        m.id === model
                          ? 'bg-emerald-50 border-emerald-500'
                          : 'bg-[var(--bg-surface)] border-[var(--border)] hover:border-[var(--border)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div>
                        <div className={`text-sm font-semibold ${m.id === model ? 'text-emerald-700' : 'text-[var(--text-primary)]'}`}>{m.name}</div>
                        <div className={`text-xs mt-0.5 ${m.id === model ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`}>{m.description}</div>
                      </div>
                      {m.id === model && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 ml-2">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-Switch */}
              <div className="flex items-center justify-between px-5 py-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Auto-switch on failure</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">Fallback to other provider if one fails</div>
                </div>
                <Toggle enabled={autoSwitch} onChange={() => onAutoSwitchChange && onAutoSwitchChange(!autoSwitch)} />
              </div>
            </div>
          )}

          {/* Display Tab */}
          {activeTab === 'editor' && editorSettings && onEditorSettingsChange && (
            <div className="space-y-6">
              {/* Theme */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 block">Theme</label>
                <div className="flex gap-3">
                  {[{ id: 'dark', label: 'Dark', desc: 'Easy on the eyes' }, { id: 'light', label: 'Light', desc: 'Clean & bright' }].map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => onEditorSettingsChange({ theme: theme.id })}
                      className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all border-2 ${
                        editorSettings.theme === theme.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div>{theme.label}</div>
                      <div className={`text-xs font-normal mt-0.5 ${editorSettings.theme === theme.id ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`}>{theme.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 block">Code Font Size</label>
                <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <button
                    onClick={() => onEditorSettingsChange({ fontSize: Math.max(10, (editorSettings.fontSize || 14) - 1) })}
                    className="w-9 h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors text-lg font-medium"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-[var(--text-primary)]">{editorSettings.fontSize || 14}</span>
                    <span className="text-sm text-[var(--text-muted)] ml-1">px</span>
                  </div>
                  <button
                    onClick={() => onEditorSettingsChange({ fontSize: Math.min(24, (editorSettings.fontSize || 14) + 1) })}
                    className="w-9 h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors text-lg font-medium"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <button
                onClick={() => setShowShortcuts(true)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-semibold transition-all bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 7l9-5-9-5-9 5 9 5z" />
                </svg>
                View Keyboard Shortcuts
              </button>
            </div>
          )}
        </div>
      </div>

      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
