import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'http://localhost:8000';

interface ArchitectureDiagramProps {
  question: string;
  className?: string;
}

export function ArchitectureDiagram({ question, className = '' }: ArchitectureDiagramProps) {
  const { token } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailLevel, setDetailLevel] = useState<'overview' | 'detailed'>('overview');
  const [cloudProvider, setCloudProvider] = useState<string>('auto');
  const [direction, setDirection] = useState<'LR' | 'TB'>('LR');

  // Pan & zoom state
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 4));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
  }, [translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslate({
      x: translateStart.current.x + (e.clientX - dragStart.current.x),
      y: translateStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!question || !token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/diagram/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            question,
            cloud_provider: cloudProvider,
            detail_level: detailLevel,
          }),
        });

        const data = await response.json();

        if (!cancelled) {
          if (data.success && data.image_url) {
            setImageUrl(data.image_url);
            resetView();
          } else {
            setError(data.error || 'Failed to generate diagram');
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Network error');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [question, token, detailLevel, cloudProvider, resetView]);

  return (
    <div className={`${className}`}>
      {/* Detail level toggle + zoom controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <select
            value={cloudProvider}
            onChange={(e) => setCloudProvider(e.target.value)}
            className="text-xs font-mono bg-transparent border border-border rounded px-1 py-0.5 text-text-dim"
          >
            <option value="auto">Auto</option>
            <option value="aws">AWS</option>
            <option value="azure">Azure</option>
            <option value="gcp">GCP</option>
            <option value="oci">OCI</option>
          </select>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <button
              onClick={() => setDirection('LR')}
              className={`px-1.5 py-0.5 text-xs font-mono transition-colors ${
                direction === 'LR' ? 'bg-primary text-white' : 'text-gray-500 hover:text-primary'
              }`}
            >LR</button>
            <button
              onClick={() => setDirection('TB')}
              className={`px-1.5 py-0.5 text-xs font-mono border-l border-gray-200 transition-colors ${
                direction === 'TB' ? 'bg-primary text-white' : 'text-gray-500 hover:text-primary'
              }`}
            >TB</button>
          </div>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <button
              onClick={() => setDetailLevel('overview')}
              className={`px-2 py-0.5 text-xs font-mono transition-colors ${
                detailLevel === 'overview'
                  ? 'bg-primary text-white'
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setDetailLevel('detailed')}
              className={`px-2 py-0.5 text-xs font-mono border-l border-gray-200 transition-colors ${
                detailLevel === 'detailed'
                  ? 'bg-primary text-white'
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>
        {imageUrl && !loading && (
          <div className="flex items-center gap-1">
            <button onClick={() => setScale(s => Math.min(s + 0.25, 4))} className="px-1.5 py-0.5 text-xs font-mono border border-border rounded hover:bg-surface2 text-text-dim">+</button>
            <span className="text-xs font-mono text-text-dim min-w-[3ch] text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.max(s - 0.25, 0.5))} className="px-1.5 py-0.5 text-xs font-mono border border-border rounded hover:bg-surface2 text-text-dim">-</button>
            <button onClick={resetView} className="px-1.5 py-0.5 text-xs font-mono border border-border rounded hover:bg-surface2 text-text-dim ml-1">Fit</button>
          </div>
        )}
      </div>

      {/* Diagram */}
      {loading && (
        <div className="flex items-center justify-center p-8 border border-border rounded-md bg-bg2">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-text-dim font-mono">Generating {detailLevel} diagram...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 border border-rose/20 rounded-md bg-rose/5 text-sm text-rose-light">
          {error}
        </div>
      )}

      {imageUrl && !loading && (
        <div
          ref={containerRef}
          className="border border-border rounded-md bg-white select-none"
          style={{ cursor: isDragging ? 'grabbing' : 'grab', overflow: 'hidden', height: '100%', minHeight: '300px' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={imageUrl}
            alt={`Architecture diagram for: ${question.slice(0, 50)}`}
            draggable={false}
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              maxWidth: 'none',
              width: '100%',
              height: 'auto',
            }}
          />
        </div>
      )}
    </div>
  );
}
