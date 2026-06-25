import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isOwner } from '@/lib/owner';
import { getDiagramCache, setDiagramCache } from '@/hooks/useDiagramCache';
import { useCloudProvider } from '@/hooks/useCloudProvider';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

// Direction + detail are locked. Two extra knobs (LR vs TB, overview vs
// detailed) added confusion without changing perceived quality, and the
// backend cache hit-rate suffered when users toggled them. One layout, one
// density.
const DIRECTION = 'TB';
const DETAIL = 'detailed';

const getCacheKey = (question: string, provider: string, designKind: string = 'system') => {
  return `${question}::${provider}::${DIRECTION}::${DETAIL}::${designKind}`;
}

type DesignKind = 'application' | 'system' | 'infrastructure';

interface ArchitectureDiagramProps {
  question: string;
  className?: string;
  /** Hint passed to the diagram service. Question-text cues still
   *  override (e.g. "design a CDN" → infrastructure even if hint=system).
   *  Default 'system' matches the historical behavior. */
  designKind?: DesignKind;
  /** When true, owners skip the manual "Generate" button — diagram is
   *  auto-triggered as soon as a cache miss is detected. Also hides the
   *  cloud selector (caller owns the picker). */
  autoGenerate?: boolean;
  /** Chips/buttons rendered on the left of the controls row, sharing one line with the zoom controls. */
  leadingControls?: React.ReactNode;
}

export const ArchitectureDiagram = ({ question, className = '', designKind = 'system', autoGenerate = false, leadingControls }: ArchitectureDiagramProps) => {
  const { token, user } = useAuth();
  // Only owners/admins may trigger fresh generation. Regular users consume
  // pre-generated diagrams from the cache. Backend enforces this via 403
  // ADMIN_ONLY on /api/diagram/generate; this gate is UX-only — hides the
  // button so users don't see a tease they can't use.
  const canGenerate = isOwner(user);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noCache, setNoCache] = useState(false);
  const [cloudProvider, setCloudProvider] = useCloudProvider();

  // Zoom — scroll-based (overflow:auto handles pan; no drag needed)
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Ctrl/Cmd+Wheel zooms; plain wheel scrolls the diagram naturally via overflow:auto
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setScale(prev => Math.min(Math.max(0.25, prev + (e.deltaY > 0 ? -0.1 : 0.1)), 4));
  }, []);
  const resetView = useCallback(() => setScale(1), []);

  // Step 1: Cache-only lookup (fast, no generation)
  useEffect(() => {
    if (!question || !token) return;
    const key = getCacheKey(question, cloudProvider, designKind);

    // Check in-memory cache
    const mem = getDiagramCache(key);
    if (mem) {
      setImageUrl(mem.data);
      setLoading(false);
      setNoCache(false);
      setError(null);
      resetView();
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNoCache(false);

    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/diagram/lookup`, {
          credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ question, cloudProvider, detailLevel: DETAIL, direction: DIRECTION, designKind }),
        });
        const data = await r.json();
        if (!cancelled) {
          if (data.success && data.image_url && !data.image_url.includes('/static/')) {
            const url = data.image_url.startsWith('/') ? `${API_URL}${data.image_url}` : data.image_url;
            setImageUrl(url);
            setDiagramCache(key, { type: 'png', data: url, timestamp: Date.now() });
            resetView();
          } else {
            setNoCache(true);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setNoCache(true); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [question, token, cloudProvider, resetView]);

  // Step 2: Explicit generation (only when user clicks Generate or autoGenerate fires)
  const handleGenerate = useCallback(async () => {
    if (!question || !token || generating) return;
    setGenerating(true);
    setError(null);
    setNoCache(false);

    try {
      const r = await fetch(`${API_URL}/api/diagram/generate`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, cloudProvider, detailLevel: DETAIL, direction: DIRECTION, designKind }),
      });
      const data = await r.json();
      if (data.success && data.image_url) {
        const url = data.image_url.startsWith('/') ? `${API_URL}${data.image_url}` : data.image_url;
        setImageUrl(url);
        const key = getCacheKey(question, cloudProvider, designKind);
        setDiagramCache(key, { type: 'png', data: url, timestamp: Date.now() });
        resetView();
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    }
    setGenerating(false);
  }, [question, token, generating, cloudProvider, designKind, resetView]);

  // Auto-trigger generation for owners when caller sets autoGenerate=true
  useEffect(() => {
    if (autoGenerate && noCache && !loading && !generating && canGenerate) {
      handleGenerate();
    }
  }, [autoGenerate, noCache, loading, generating, canGenerate, handleGenerate]);

  return (
    <div className={className}>
      {/* Controls — single row: leading chips (Python/Graphviz) + zoom buttons */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        {leadingControls && <div className="flex items-center gap-1">{leadingControls}</div>}
        {!autoGenerate && (
          <div className="flex items-center gap-2">
            <select value={cloudProvider} onChange={(e) => setCloudProvider(e.target.value as 'auto' | 'aws' | 'azure' | 'gcp')}
              className="text-xs font-mono bg-transparent border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text-muted)]">
              <option value="auto">Auto</option>
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
              <option value="gcp">GCP</option>
            </select>
          </div>
        )}
        {imageUrl && !loading && (
          <div className="flex items-center gap-1">
            <button onClick={() => setScale(s => Math.min(s + 0.25, 4))} className="px-1.5 py-0.5 text-xs font-mono border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]">+</button>
            <span className="text-xs font-mono text-gray-400 min-w-[3ch] text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.max(s - 0.25, 0.25))} className="px-1.5 py-0.5 text-xs font-mono border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]">-</button>
            <button onClick={resetView} className="px-1.5 py-0.5 text-xs font-mono border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] ml-1">Fit</button>
            <button onClick={() => setIsFullscreen(true)} className="px-1.5 py-0.5 text-xs font-mono border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] ml-1" title="View full size">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center p-8 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            <span className="text-sm text-[var(--text-muted)] font-mono">Looking up cached diagram...</span>
          </div>
        </div>
      )}

      {/* No cached diagram. Owners see Generate; regular users see a notice
          (diagrams are pre-generated by the team and shipped via cache). */}
      {noCache && !loading && !generating && (
        <div className="flex flex-col items-center justify-center p-6 rounded-lg text-center gap-2" style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          {canGenerate ? (
            <button onClick={handleGenerate}
              className="px-5 py-2.5 text-sm font-bold rounded-lg transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'var(--accent)', color: '#FFFFFF', boxShadow: '0 2px 12px rgba(38,97,156,0.3)' }}>
              Generate Architecture Diagram
            </button>
          ) : (
            <>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Diagram coming soon
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Architecture diagrams are pre-built by our team. This one is on the way.
              </div>
            </>
          )}
        </div>
      )}

      {/* Generating */}
      {generating && (
        <div className="flex items-center justify-center p-8 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--accent-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            <span className="text-sm text-[var(--accent)] font-mono">Generating {cloudProvider === 'auto' ? '' : cloudProvider.toUpperCase()} diagram...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && !generating && (
        <div className="p-4 rounded-lg" style={{ border: '1px solid var(--warning)', background: 'var(--bg-elevated)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--warning-text)' }}>{error}</p>
          {canGenerate && (
            <button onClick={handleGenerate}
              className="px-3 py-1 text-xs font-medium rounded transition-[background-color,border-color,color] active:scale-[0.98]"
              style={{ background: 'var(--bg-elevated)', color: 'var(--warning-text)', border: '1px solid var(--warning)' }}>
              Retry
            </button>
          )}
        </div>
      )}

      {/* Image — fills panel width at 100% so text is readable; tall TB diagrams
          scroll vertically via overflow:auto on the container. Ctrl/Cmd+Wheel or
          the +/- buttons zoom by scaling the inner wrapper width. */}
      {imageUrl && !loading && !generating && (
        <div ref={containerRef}
          className="rounded-lg select-none"
          style={{ overflow: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          onWheel={handleWheel}>
          <div style={{ width: `${Math.round(scale * 100)}%`, minWidth: '100%', margin: '0 auto' }}>
            <img src={imageUrl} alt={`Architecture: ${question.slice(0, 50)}`} draggable={false}
              style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        </div>
      )}

      {/* Fullscreen overlay — click backdrop or ✕ to close */}
      {isFullscreen && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.93)' }}
          onClick={() => setIsFullscreen(false)}
        >
          <div
            className="flex items-center justify-between px-4 py-2 shrink-0"
            style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}
            onClick={e => e.stopPropagation()}
          >
            <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--cam-strip-heading)' }}>Architecture Diagram</span>
            <div className="flex items-center gap-1 text-[var(--text-muted)]">
              <span className="text-[10px] font-mono mr-2 opacity-60">Click outside to close</span>
              <button
                onClick={() => setIsFullscreen(false)}
                className="w-7 h-7 flex items-center justify-center rounded transition-colors"
                style={{ color: 'var(--cam-strip-heading)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--cam-strip-icon-bg)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                title="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <div
            className="flex-1 overflow-auto flex items-start justify-center p-6"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={imageUrl}
              alt={`Architecture: ${question.slice(0, 80)}`}
              draggable={false}
              style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 40px rgba(0,0,0,0.6)' }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
