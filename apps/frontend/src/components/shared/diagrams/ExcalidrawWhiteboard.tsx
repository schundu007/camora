import { useState, useRef, useCallback, useEffect } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawImperativeAPI, ExcalidrawElement } from '@excalidraw/excalidraw/types';

interface ExcalidrawWhiteboardProps {
  initialElements?: readonly ExcalidrawElement[];
  onChange?: (elements: readonly ExcalidrawElement[]) => void;
  onLoadAIDiagram?: () => Promise<string | null>;
  className?: string;
}

export default function ExcalidrawWhiteboard({
  initialElements,
  onChange,
  onLoadAIDiagram,
  className = '',
}: ExcalidrawWhiteboardProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced onChange handler
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      if (!onChange) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const activeElements = elements.filter((el) => !el.isDeleted);
        onChange(activeElements);
      }, 500);
    },
    [onChange],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Load AI diagram and convert Mermaid to Excalidraw elements
  const handleLoadAIDiagram = useCallback(async () => {
    if (!onLoadAIDiagram || !excalidrawAPI) return;
    setLoadingAI(true);
    try {
      const mermaidCode = await onLoadAIDiagram();
      if (!mermaidCode) {
        console.warn('No mermaid code returned from AI diagram');
        return;
      }

      let excalidrawElements: any[] = [];

      try {
        const { parseMermaidToExcalidraw } = await import(
          '@excalidraw/mermaid-to-excalidraw'
        );
        const { convertToExcalidrawElements } = await import(
          '@excalidraw/excalidraw'
        );
        const { elements: skeletonElements } =
          await parseMermaidToExcalidraw(mermaidCode);
        excalidrawElements = convertToExcalidrawElements(skeletonElements);
      } catch (convErr) {
        console.warn('Mermaid-to-Excalidraw conversion failed, creating text fallback:', convErr);
        // Fallback: render mermaid code as a readable text element on the canvas
        const id = Math.random().toString(36).slice(2, 10);
        excalidrawElements = [{
          id,
          type: 'text' as const,
          x: 50,
          y: 50,
          width: 600,
          height: 400,
          text: mermaidCode,
          fontSize: 14,
          fontFamily: 3,
          textAlign: 'left' as const,
          verticalAlign: 'top' as const,
          strokeColor: '#1e1e1e',
          backgroundColor: 'transparent',
          fillStyle: 'solid' as const,
          strokeWidth: 1,
          roughness: 0,
          opacity: 100,
          angle: 0,
          groupIds: [],
          boundElements: null,
          updated: Date.now(),
          version: 1,
          versionNonce: 0,
          isDeleted: false,
          link: null,
          locked: false,
        }];
      }

      if (excalidrawElements.length > 0) {
        excalidrawAPI.updateScene({ elements: excalidrawElements });
        excalidrawAPI.scrollToContent(excalidrawElements, { fitToContent: true });
      }
    } catch (err) {
      console.error('Failed to load AI diagram:', err);
    } finally {
      setLoadingAI(false);
    }
  }, [onLoadAIDiagram, excalidrawAPI]);

  return (
    <div
      className={className}
      style={{ width: '100%', height: '100%', minHeight: 400, position: 'relative' }}
    >
      <Excalidraw
        excalidrawAPI={setExcalidrawAPI}
        initialData={{
          elements: initialElements ? [...initialElements] : [],
          appState: {
            theme: 'light',
            viewBackgroundColor: '#ffffff',
            currentItemFontFamily: 1,
            gridSize: null,
            openSidebar: null,
          },
        }}
        onChange={handleChange}
        UIOptions={{
          canvasActions: {
            export: false,
            saveAsImage: true,
            loadScene: false,
          },
          tools: {
            image: false,
          },
        }}
        renderTopRightUI={() =>
          onLoadAIDiagram ? (
            <button
              type="button"
              onClick={handleLoadAIDiagram}
              disabled={loadingAI}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap transition-colors disabled:cursor-wait disabled:opacity-60"
              style={{
                color: 'var(--accent)',
                background: 'var(--bg-elevated)',
                borderColor: 'var(--border)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {loadingAI ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                  </svg>
                  Load AI Diagram
                </>
              )}
            </button>
          ) : null
        }
      />
      {/* Hide the Excalidraw library sidebar — keeps the toolbar minimal. */}
      <style>{`.excalidraw .layer-ui__library { display: none !important; }`}</style>
    </div>
  );
}
