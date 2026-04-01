import { useEffect, useRef } from 'react';

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
  if (!d.match(/^(graph|flowchart)/i)) {
    d = 'graph TD\n' + d;
  }
  return d;
}

let mermaidLoadPromise: Promise<any> | null = null;
function loadMermaidCDN(): Promise<any> {
  if ((window as any).mermaid) return Promise.resolve((window as any).mermaid);
  if (mermaidLoadPromise) return mermaidLoadPromise;
  mermaidLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    s.onload = () => {
      const poll = setInterval(() => {
        if ((window as any).mermaid) { clearInterval(poll); resolve((window as any).mermaid); }
      }, 50);
      setTimeout(() => { clearInterval(poll); reject(new Error('timeout')); }, 10000);
    };
    s.onerror = () => reject(new Error('CDN failed'));
    document.head.appendChild(s);
  });
  return mermaidLoadPromise;
}

// Cache rendered SVGs so re-renders don't re-trigger Mermaid
const svgCache = new Map<string, string>();

export function MermaidDiagram({ content, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = 'light';
  const contentKey = content.trim().slice(0, 100); // Cache key

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const raw = content.trim();
    if (!raw) return;

    // If already has rendered SVG, don't touch it
    if (el.querySelector('svg')) return;

    // Check cache first
    const cacheKey = `${contentKey}-${theme}`;
    if (svgCache.has(cacheKey)) {
      el.innerHTML = svgCache.get(cacheKey)!;
      return;
    }

    // ASCII art fallback — use textContent to prevent XSS
    if (/[┌┐└┘│─╔╗╚╝║═]/.test(raw) || /\+-{3,}/.test(raw)) {
      const pre = document.createElement('pre');
      pre.style.cssText = "font-family:'Courier New',monospace;font-size:14px;white-space:pre;overflow-x:auto;padding:8px;line-height:1.4";
      pre.textContent = raw;
      el.innerHTML = '';
      el.appendChild(pre);
      return;
    }

    const cleaned = cleanForMermaid(raw);

    (async () => {
      try {
        const mermaid = await loadMermaidCDN();
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          fontSize: 16,
          flowchart: { useMaxWidth: true, htmlLabels: false, curve: 'basis' },
          securityLevel: 'strict',
        });

        const id = `mmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const { svg } = await mermaid.render(id, cleaned);

        if (el) {
          el.innerHTML = svg;
          svgCache.set(cacheKey, svg);
        }
      } catch (err) {
        console.warn('[Mermaid] Falling back:', err);
        if (el && !el.querySelector('svg')) {
          const pre = document.createElement('pre');
          pre.style.cssText = "font-family:'Courier New',monospace;font-size:14px;white-space:pre;overflow-x:auto;padding:8px;line-height:1.4";
          pre.textContent = cleaned;
          el.innerHTML = '';
          el.appendChild(pre);
        }
      }
    })();
  }, [content, theme, contentKey]);

  return <div ref={containerRef} className={`overflow-auto p-2 min-h-[80px] ${className}`} />;
}
