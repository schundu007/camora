import { lazy, Suspense } from 'react';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

interface SharedCodeEditorProps {
  language: string;
  code: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
  theme?: 'vs-dark' | 'light';
  fontSize?: number;
  height?: string;
  showLineNumbers?: boolean;
  className?: string;
}

function EditorSkeleton({ height }: { height: string }) {
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

export default function SharedCodeEditor({
  language,
  code,
  onChange,
  readOnly = false,
  theme = 'vs-dark',
  fontSize = 14,
  height = '300px',
  showLineNumbers = true,
  className,
}: SharedCodeEditorProps) {
  return (
    <div className={className} style={{ height, overflow: 'hidden' }}>
      <Suspense fallback={<EditorSkeleton height={height} />}>
        <MonacoEditor
          height={height}
          language={language}
          value={code}
          onChange={(val) => onChange(val || '')}
          theme={theme}
          options={{
            fontSize,
            readOnly,
            lineNumbers: showLineNumbers ? 'on' : 'off',
            minimap: { enabled: false },
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
            scrollbar: { verticalSliderSize: 6, horizontalSliderSize: 6 },
            wordWrap: 'off',
            tabSize: language === 'python' ? 4 : 2,
          }}
        />
      </Suspense>
    </div>
  );
}
