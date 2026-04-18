import { useState, useEffect } from 'react';
import { Icon } from '../../shared/Icons.jsx';

export default function CloudArchitectureDiagram({ imageUrl, loading = false, error = null, cloudProvider = 'auto', onRetry }) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 rounded-lg" style={{ background: '#0D0C14' }}>
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <div>
            <p className="text-lg text-gray-300 font-medium">Generating architecture diagram...</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Using {cloudProvider.toUpperCase()} cloud icons</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <Icon name="alertTriangle" size={24} className="mx-auto mb-2 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-3 px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (!imageUrl || imageError) {
    return (
      <div className="text-center py-8 rounded-lg" style={{ background: '#0D0C14' }}>
        <Icon name="image" size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
        <p className="text-lg text-[var(--text-muted)]">No pre-generated diagram available</p>
        <p className="text-sm text-[var(--text-muted)] mt-1">Real AWS/GCP/Azure cloud icons</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-3 px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-colors font-medium">
            Generate Diagram
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
      <img
        src={imageUrl}
        alt="System Architecture Diagram"
        className="w-full object-contain"
        style={{ maxHeight: '80vh', width: '100%' }}
        onError={() => setImageError(true)}
      />
    </div>
  );
}
