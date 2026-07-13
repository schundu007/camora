import { lazy, Suspense, useCallback, useState } from 'react';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

interface SharedCodeEditorProps {
  language: string;
  code: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
  theme?: 'vs-dark' | 'vs';
  fontSize?: number;
  height?: string;
  showLineNumbers?: boolean;
  className?: string;
  onMount?: (editor: any, monaco?: any) => void;
  // When true the editor sizes its own height to the code (grows downward with
  // the line count) instead of filling a fixed box. The editor then has no
  // internal vertical scroll — a scrolling ANCESTOR must handle overflow, and
  // "reveal line" must scroll that ancestor (Monaco can't scroll itself here).
  autoHeight?: boolean;
  // Floor for auto-height so an empty/one-line editor still has a usable height.
  minHeight?: number;
}

const EditorSkeleton = ({ height }: { height: string }) => {
  return (
    <div
      className="shimmer rounded-md flex items-center justify-center"
      style={{ height }}
    >
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0ms]" />
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:150ms]" />
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:300ms]" />
        </div>
        <span className="text-[var(--text-muted)] text-sm">Loading editor...</span>
      </div>
    </div>
  );
}

const SharedCodeEditor = ({
  language,
  code,
  onChange,
  readOnly = false,
  theme = 'vs-dark',
  fontSize = 14,
  height = '300px',
  showLineNumbers = true,
  className,
  onMount,
  autoHeight = false,
  minHeight = 120,
}: SharedCodeEditorProps) => {
  // In auto-height mode the editor height tracks Monaco's content height, which
  // updates on every content-size change (typing, folding, wrap).
  const [autoPx, setAutoPx] = useState<number>(minHeight);

  const handleMount = useCallback((editor: any, monaco: any) => {
    if (autoHeight) {
      const sync = () => {
        const h = Math.max(minHeight, Math.ceil(editor.getContentHeight()));
        setAutoPx((prev) => (prev === h ? prev : h));
      };
      editor.onDidContentSizeChange(sync);
      sync();
    }
    onMount?.(editor, monaco);
  }, [autoHeight, minHeight, onMount]);

  const resolvedHeight = autoHeight ? `${autoPx}px` : height;

  return (
    <div className={className} style={{ height: resolvedHeight, overflow: 'hidden' }}>
      <Suspense fallback={<EditorSkeleton height={resolvedHeight} />}>
        <MonacoEditor
          height={resolvedHeight}
          language={language}
          value={code}
          onChange={(val) => onChange(val || '')}
          beforeMount={(m) => { m.editor.setTheme(theme ?? 'vs-dark'); }}
          onMount={handleMount}
          theme={theme}
          options={{
            fontSize,
            readOnly,
            lineNumbers: showLineNumbers ? 'on' : 'off',
            minimap: { enabled: false },
            // Sticky-scroll pins class/def headers at the viewport top; over a
            // transparent/overlay editor bg they render on top of the scrolled
            // code as overlapping/ghosted lines. Off for a clean scroll.
            stickyScroll: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 8, bottom: 8 },
            renderLineHighlight: readOnly ? 'none' : 'line',
            automaticLayout: true,
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            folding: true,
            suggest: { showWords: false },
            quickSuggestions: false,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalSliderSize: 6,
              horizontalSliderSize: 6,
              // Auto-height editors are exactly as tall as their content, so hide
              // the vertical scrollbar and let wheel events bubble to the
              // scrolling ancestor instead of being swallowed here.
              vertical: autoHeight ? 'hidden' : 'auto',
              alwaysConsumeMouseWheel: !autoHeight,
            },
            wordWrap: 'off',
            tabSize: language === 'python' ? 4 : 2,
          }}
        />
      </Suspense>
    </div>
  );
};

export default SharedCodeEditor;
