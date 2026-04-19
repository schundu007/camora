import { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  content: string;
  className?: string;
}

function cleanForMermaid(raw: string): string {
  let d = raw.trim();
  d = d.replace(/^```(?:mermaid)?\s*/i, '').replace(/```\s*$/, '');
  d = d.replace(/<br\s*\/?>/gi, ' ');
  d = d.replace(/<\/?\w+[^>]*>/g, ' ');
  d = d.replace(/&amp;/g, ' and ').replace(/&/g, ' and ');
  d = d.replace(/[""]/g, '"').replace(/['']/g, "'");
  d = d.replace(/  +/g, ' ');
  if (!d.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph)/i)) {
    d = 'graph TD\n' + d;
  }
  return d;
}

// Cache rendered SVGs so re-renders don't re-trigger Mermaid
const svgCache = new Map<string, string>();

// Singleton mermaid instance loaded via dynamic import
let mermaidInstance: any = null;
let mermaidLoading: Promise<any> | null = null;

async function getMermaid() {
  if (mermaidInstance) return mermaidInstance;
  if (mermaidLoading) return mermaidLoading;
  mermaidLoading = (async () => {
    const mod = await import('mermaid');
    mermaidInstance = mod.default;
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: 'default',
      fontSize: 14,
      flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis', padding: 15 },
      securityLevel: 'loose',
    });
    return mermaidInstance;
  })();
  return mermaidLoading;
}

export function MermaidDiagram({ content, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);
  const renderedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    renderedRef.current = false;
    setError(null);
    setRendering(true);

    const raw = content.trim();
    if (!raw) { setRendering(false); return; }

    // ASCII art — render directly
    if (/[┌┐└┘│─╔╗╚╝║═]/.test(raw) || /\+-{3,}/.test(raw)) {
      el.innerHTML = '';
      const pre = document.createElement('pre');
      pre.style.cssText = "font-family:'Courier New',monospace;font-size:14px;white-space:pre;overflow-x:auto;padding:12px;line-height:1.4";
      pre.textContent = raw;
      el.appendChild(pre);
      setRendering(false);
      return;
    }

    const cleaned = cleanForMermaid(raw);
    const cacheKey = cleaned.slice(0, 200);

    // Check cache
    if (svgCache.has(cacheKey)) {
      el.innerHTML = svgCache.get(cacheKey)!;
      setRendering(false);
      return;
    }

    (async () => {
      try {
        const mermaid = await getMermaid();
        const id = `mmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const { svg } = await mermaid.render(id, cleaned);

        if (el && !renderedRef.current) {
          renderedRef.current = true;
          el.innerHTML = svg;
          svgCache.set(cacheKey, svg);

          // Style the SVG for better visibility
          const svgEl = el.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
          }
        }
      } catch (err: any) {
        console.error('[MermaidDiagram] Render error:', err);
        setError(err?.message || 'Failed to render diagram');
      } finally {
        setRendering(false);
      }
    })();

    return () => { renderedRef.current = true; };
  }, [content]);

  if (rendering) {
    return (
      <div className={`flex items-center justify-center p-8 min-h-[200px] ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-200 border-t-[var(--accent)] rounded-full animate-spin" />
          <span className="text-sm text-[var(--text-muted)]">Rendering diagram...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <p className="text-xs text-red-500 mb-2 font-medium">Diagram render failed: {error}</p>
        <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-gray-600 max-h-[300px] overflow-y-auto">
          {cleanForMermaid(content)}
        </pre>
      </div>
    );
  }

  return <div ref={containerRef} className={`overflow-auto p-2 ${className}`} />;
}
