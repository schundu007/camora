import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '../../shared/Icons.jsx';

export default function CloudArchitectureDiagram({ imageUrl, loading = false, error = null, cloudProvider = 'auto', onRetry }) {
  const [imageError, setImageError] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const transStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const resetView = useCallback(() => { setScale(1); setTranslate({ x: 0, y: 0 }); }, []);
  const fitToWidth = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return;
    const cw = containerRef.current.clientWidth;
    const iw = imgRef.current.naturalWidth;
    if (iw > 0) { setScale(Math.max(1, cw / iw * 1.8)); setTranslate({ x: 0, y: 0 }); }
  }, []);

  useEffect(() => { setImageError(false); resetView(); }, [imageUrl, resetView]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 rounded-lg bg-[var(--bg-surface)]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-200 border-t-[var(--accent)] rounded-full animate-spin" />
          <div>
            <p className="text-sm text-[var(--text-secondary)] font-medium">Generating architecture diagram...</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Using {cloudProvider.toUpperCase()} cloud icons</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 rounded-lg bg-[var(--danger)]/5 border border-[var(--danger)]/20">
        <Icon name="alertTriangle" size={24} className="mx-auto mb-2 text-[var(--danger)]" />
        <p className="text-sm text-[var(--danger)]">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-3 px-4 py-2 text-sm bg-[var(--danger)]/10 text-[var(--danger)] rounded-lg hover:bg-[var(--danger)]/20 transition-colors">
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (!imageUrl || imageError) {
    return (
      <div className="text-center py-12 rounded-lg bg-[var(--bg-surface)]">
        <Icon name="image" size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">No pre-generated diagram available</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Real AWS/GCP/Azure cloud icons</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-3 px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-colors font-medium">
            Generate Diagram
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Zoom controls */}
      <div className="flex items-center justify-end gap-1 mb-2">
        <button onClick={() => setScale(s => Math.min(s + 0.3, 5))} className="px-2 py-1 text-xs font-mono border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]">+</button>
        <span className="text-[10px] font-mono text-[var(--text-muted)] min-w-[3.5ch] text-center">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.max(s - 0.3, 0.3))} className="px-2 py-1 text-xs font-mono border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]">−</button>
        <button onClick={fitToWidth} className="px-2 py-1 text-xs font-mono border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] ml-1">Fit</button>
        <button onClick={resetView} className="px-2 py-1 text-xs font-mono border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]">1:1</button>
      </div>
      <div ref={containerRef}
        className="rounded-lg select-none flex items-center justify-center"
        style={{ cursor: dragging ? 'grabbing' : 'grab', overflow: 'hidden', height: '450px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        onWheel={e => { e.preventDefault(); setScale(s => Math.min(Math.max(0.3, s + (e.deltaY > 0 ? -0.15 : 0.15)), 5)); }}
        onMouseDown={e => { if (e.button !== 0) return; setDragging(true); dragStart.current = { x: e.clientX, y: e.clientY }; transStart.current = { ...translate }; }}
        onMouseMove={e => { if (!dragging) return; setTranslate({ x: transStart.current.x + (e.clientX - dragStart.current.x), y: transStart.current.y + (e.clientY - dragStart.current.y) }); }}
        onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)}>
        <img ref={imgRef} src={imageUrl} alt="System Architecture Diagram" draggable={false}
          onLoad={fitToWidth}
          onError={() => setImageError(true)}
          style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, transformOrigin: 'center center', maxWidth: 'none', height: 'auto' }} />
      </div>
    </div>
  );
}
