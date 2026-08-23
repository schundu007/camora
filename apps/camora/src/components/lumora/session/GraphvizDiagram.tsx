import { useEffect, useRef, useState } from 'react';

interface GraphvizDiagramProps {
  /** Raw Graphviz DOT source. The component does NOT render mermaid —
   *  use MermaidDiagram for that. */
  content: string;
  /** Layout engine — `dot` is right for flowcharts/sequences; `neato`
   *  for force-directed; `sfdp` for very large graphs. Default `dot`. */
  engine?: 'dot' | 'neato' | 'sfdp' | 'fdp' | 'twopi' | 'circo';
  className?: string;
}

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'http://localhost:8000';

// Fingerprint cache so re-renders of the same DOT body don't re-hit the
// backend. Key = first 200 chars of the DOT — collisions are fine since
// the LLM rarely emits two near-identical bodies.
const svgCache = new Map<string, string>();

/**
 * Server-rendered Graphviz diagram. POSTs the DOT body to
 * /api/v1/diagram/render-dot which proxies to the ai-services Python
 * microservice (it has the `dot` binary already installed for the
 * build-time topic-diagram baker).
 *
 * Parallel to MermaidDiagram for the migration off client-side Mermaid.
 * Once the LLM prompts are updated to emit DOT instead of mermaid, the
 * Mermaid component + dependency can be removed.
 */
export const GraphvizDiagram = ({ content, engine = 'dot', className = '' }: GraphvizDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);
  const lastReqRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setError(null);
    setRendering(true);

    const dot = (content || '').trim();
    if (!dot) {
      setRendering(false);
      return;
    }

    const cacheKey = `${engine}::${dot.slice(0, 200)}`;
    const cached = svgCache.get(cacheKey);
    if (cached) {
      el.innerHTML = cached;
      setRendering(false);
      return;
    }

    // Track the request id so a stale response from a previous render
    // can't overwrite a newer SVG (rapid prop change → out-of-order
    // promise resolution).
    const reqId = ++lastReqRef.current;

    (async () => {
      try {
        const resp = await fetch(`${API_URL}/api/v1/diagram/render-dot`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dot, engine, format: 'svg' }),
        });
        if (reqId !== lastReqRef.current) return;
        const data = await resp.json().catch(() => null);
        if (!resp.ok || !data?.success) {
          throw new Error(data?.error || `Render failed (${resp.status})`);
        }
        const svg = data.content as string;
        svgCache.set(cacheKey, svg);
        if (el && reqId === lastReqRef.current) {
          el.innerHTML = svg;
          // Lock the SVG to the container width so wide graphs scroll
          // vertically inside the panel rather than blowing out the layout.
          const svgEl = el.querySelector('svg');
          if (svgEl) {
            svgEl.removeAttribute('width');
            svgEl.removeAttribute('height');
            svgEl.setAttribute('style', 'max-width:100%;height:auto;display:block;');
          }
        }
      } catch (err: any) {
        if (reqId !== lastReqRef.current) return;
        console.error('[GraphvizDiagram] render error:', err);
        setError(err?.message || 'Failed to render diagram');
      } finally {
        if (reqId === lastReqRef.current) setRendering(false);
      }
    })();
  }, [content, engine]);

  if (rendering) {
    return (
      <div className={`flex items-center justify-center p-8 min-h-[200px] ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--bg-elevated)] border-t-[var(--accent)] rounded-full animate-spin" />
          <span className="text-sm text-[var(--text-muted)]">Rendering diagram…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <p className="text-xs text-[var(--danger)] mb-2 font-medium">Diagram render failed: {error}</p>
        <pre
          className="text-xs font-mono rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          {content}
        </pre>
      </div>
    );
  }

  return <div ref={containerRef} className={`overflow-auto p-2 ${className}`} />;
}
