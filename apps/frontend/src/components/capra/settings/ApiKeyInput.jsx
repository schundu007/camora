import { useState } from 'react';

const providerConfig = {
  anthropic: {
    name: 'Anthropic',
    placeholder: 'sk-ant-...',
    helpUrl: 'https://console.anthropic.com/settings/keys',
  },
  openai: {
    name: 'OpenAI',
    placeholder: 'sk-...',
    helpUrl: 'https://platform.openai.com/api-keys',
  },
  eraser: {
    name: 'Eraser.io',
    placeholder: 'eraser_...',
    helpUrl: 'https://app.eraser.io/settings/api',
  },
  deepgram: {
    name: 'Deepgram',
    placeholder: 'dg_...',
    helpUrl: 'https://console.deepgram.com/settings/api-keys',
  },
};

export default function ApiKeyInput({
  provider,
  currentKey,
  hasKey,
  onSave,
  onDelete,
}) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(!hasKey);
  const [validationStatus, setValidationStatus] = useState(null);
  const [validating, setValidating] = useState(false);

  const config = providerConfig[provider] || {
    name: provider,
    placeholder: 'Enter API key',
  };

  const handleValidateAndSave = async () => {
    if (!key.trim()) return;

    setValidating(true);
    setValidationStatus(null);

    try {
      await onSave(key);
      setKey('');
      setIsEditing(false);
    } catch (err) {
      setValidationStatus({ type: 'error', message: err.message });
    } finally {
      setValidating(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Remove ${config.name} API key?`)) {
      await onDelete();
      setIsEditing(true);
    }
  };

  return (
    <div className="py-3" style={{ borderBottom: '1px solid #e5e5e5' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: '#333333' }}>{config.name}</span>
        {hasKey && !isEditing && (
          <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} title="Configured" />
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setValidationStatus(null);
              }}
              placeholder={config.placeholder}
              className="w-full px-3 py-2 rounded text-sm font-mono focus:outline-none"
              style={{
                background: '#f5f5f5',
                border: '1px solid #e5e5e5',
                color: '#333333',
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium"
              style={{ color: '#666666' }}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>

          {validationStatus && (
            <p className="text-xs" style={{ color: '#ef4444' }}>{validationStatus.message}</p>
          )}

          <div className="flex items-center justify-between">
            <a
              href={config.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium"
              style={{ color: '#10b981' }}
            >
              Get key →
            </a>

            <div className="flex items-center gap-2">
              {hasKey && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 text-xs font-medium"
                  style={{ color: '#666666' }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleValidateAndSave}
                disabled={!key.trim() || validating}
                className="px-3 py-1 text-xs font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#10b981', color: '#ffffff' }}
              >
                {validating ? '...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <code className="text-xs font-mono" style={{ color: '#666666' }}>
            {currentKey ? `${currentKey.slice(0, 7)}${'*'.repeat(20)}${currentKey.slice(-4)}` : '**************'}
          </code>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-medium"
              style={{ color: '#666666' }}
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="text-xs font-medium"
              style={{ color: '#ef4444' }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
