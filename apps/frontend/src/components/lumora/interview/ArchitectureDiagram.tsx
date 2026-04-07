import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Use ascend-backend which has DB caching (ascend_diagram_cache table)
const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

// In-memory cache: survives re-renders and navigation within same session
const diagramMemoryCache: Record<string, string> = {};

function getCacheKey(question: string, provider: string, detail: string, dir: string) {
  return `${question}::${provider}::${dir}::${detail}`;
}

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

    const key = getCacheKey(question, cloudProvider, detailLevel, direction);

    // 1. Check in-memory cache first (instant, no API call)
    if (diagramMemoryCache[key]) {
      setImageUrl(diagramMemoryCache[key]);
      setLoading(false);
      setError(null);
      resetView();
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // 2. Call ascend-backend which checks DB cache before generating
        const response = await fetch(`${API_URL}/api/diagram/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            question,
            cloudProvider,
            detailLevel,
            direction,
          }),
        });

        if (!response.ok) throw new Error(`${response.status}`);
        const data = await response.json();

        if (!cancelled) {
          if (data.success && data.image_url) {
            // Resolve relative URLs to absolute
            const url = data.image_url.startsWith('/')
              ? `${API_URL}${data.image_url}`
              : data.image_url;
            setImageUrl(url);
            diagramMemoryCache[key] = url; // cache for session
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
  }, [question, token, detailLevel, cloudProvider, direction, resetView]);

  return (
    <div className={`${className}`}>
      {/* Detail level toggle + zoom controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <select
            value={cloudProvider}
            onChange={(e) => setCloudProvider(e.target.value)}
            className="text-xs font-mono bg-transparent border border-[#e3e8ee] rounded px-1 py-0.5 text-gray-500"
          >
            <option value="auto">Auto</option>
            <option value="aws">AWS</option>
            <option value="azure">Azure</option>
            <option value="gcp">GCP</option>
          </select>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <button
              onClick={() => setDirection('LR')}
              className={`px-1.5 py-0.5 text-xs font-mono transition-colors ${
                direction === 'LR' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-emerald-600'
              }`}
            >LR</button>
            <button
              onClick={() => setDirection('TB')}
              className={`px-1.5 py-0.5 text-xs font-mono border-l border-gray-200 transition-colors ${
                direction === 'TB' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-emerald-600'
              }`}
            >TB</button>
          </div>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <button
              onClick={() => setDetailLevel('overview')}
              className={`px-2 py-0.5 text-xs font-mono transition-colors ${
                detailLevel === 'overview' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-emerald-600'
              }`}
            >Overview</button>
            <button
              onClick={() => setDetailLevel('detailed')}
              className={`px-2 py-0.5 text-xs font-mono border-l border-gray-200 transition-colors ${
                detailLevel === 'detailed' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-emerald-600'
              }`}
            >Detailed</button>
          </div>
        </div>
        {imageUrl && !loading && (
          <div className="flex items-center gap-1">
            <button onClick={() => setScale(s => Math.min(s + 0.25, 4))} className="px-1.5 py-0.5 text-xs font-mono border border-gray-200 rounded hover:bg-gray-50 text-gray-500">+</button>
            <span className="text-xs font-mono text-gray-400 min-w-[3ch] text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.max(s - 0.25, 0.5))} className="px-1.5 py-0.5 text-xs font-mono border border-gray-200 rounded hover:bg-gray-50 text-gray-500">-</button>
            <button onClick={resetView} className="px-1.5 py-0.5 text-xs font-mono border border-gray-200 rounded hover:bg-gray-50 text-gray-500 ml-1">Fit</button>
          </div>
        )}
      </div>

      {/* Diagram */}
      {loading && (
        <div className="flex items-center justify-center p-8 border border-[#e3e8ee] rounded-lg bg-white">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-400 font-mono">Generating {detailLevel} diagram...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span className="text-sm font-semibold text-amber-700">Diagram temporarily unavailable</span>
          </div>
          <p className="text-xs text-amber-600">The diagram service is warming up. Try again in a moment.</p>
          <button
            onClick={() => { setError(null); setLoading(true); }}
            className="mt-2 px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {imageUrl && !loading && (
        <div
          ref={containerRef}
          className="border border-[#e3e8ee] rounded-lg bg-white select-none"
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
