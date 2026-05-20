import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Editor, useMonaco } from '@monaco-editor/react';
import SharedCodeEditor from '@/components/shared/code/SharedCodeEditor';
import { AnnotationPanel } from './AnnotationPanel';
import { streamCoFixResponse } from '@/lib/sse-client';
import type { CoFixAnswer, CoFixChange } from '@/lib/sse-client';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

function detectLanguage(text: string): string {
  if (/def\s+\w+\s*\(|class\s+\w+:|import\s+\w+|print\s*\(/.test(text)) return 'python';
  if (/function\s+\w+\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|=>\s*{/.test(text)) return 'javascript';
  if (/public\s+class\s+\w+|System\.out\.print/.test(text)) return 'java';
  if (/#include\s*<|int\s+main\s*\(/.test(text)) return /vector<|cout/.test(text) ? 'cpp' : 'c';
  if (/func\s+\w+\s*\(.*\)\s*(->|\{)|package\s+main/.test(text)) return 'go';
  if (/pub\s+fn\s+\w+|let\s+mut\s+\w+/.test(text)) return 'rust';
  return 'python';
}

const LANGUAGES = [
  { id: 'auto', label: 'Auto-detect' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
];

export function CoFixLayout() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const monaco = useMonaco();

  const [inputCode, setInputCode] = useState('');
  const [hint, setHint] = useState('');
  const [language, setLanguage] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [fixedCode, setFixedCode] = useState('');
  const [changes, setChanges] = useState<CoFixChange[]>([]);
  const [complexity, setComplexity] = useState<{ time: string; space: string } | null>(null);
  const [hackerrankCompatible, setHackerrankCompatible] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const rightEditorRef = useRef<any>(null);
  const decorationCollectionRef = useRef<any>(null);

  const effectiveLang = language === 'auto' ? detectLanguage(inputCode) : language;
  const lineCount = inputCode.split('\n').length;

  useEffect(() => {
    const editor = rightEditorRef.current;
    if (!editor || !monaco || changes.length === 0) return;

    const newDecorations = changes.map(change => ({
      range: new monaco.Range(change.line, 1, change.line, 1),
      options: {
        isWholeLine: true,
        className: change.type === 'fix' ? 'cofix-line-fix' : 'cofix-line-added',
      },
    }));

    if (decorationCollectionRef.current) {
      decorationCollectionRef.current.set(newDecorations);
    } else {
      decorationCollectionRef.current = editor.createDecorationsCollection(newDecorations);
    }
  }, [changes, monaco, fixedCode]);

  const handleFix = useCallback(async () => {
    if (inputCode.trim().length < 5 || isLoading) return;

    abortRef.current?.abort();
    setIsLoading(true);
    setFixedCode('');
    setChanges([]);
    setComplexity(null);
    setHackerrankCompatible(null);
    setError(null);
    setRunOutput(null);
    decorationCollectionRef.current = null;

    const controller = await streamCoFixResponse({
      code: inputCode,
      hint: hint.trim() || undefined,
      language: effectiveLang,
      token: token!,
      onAnswer: (data: CoFixAnswer) => {
        setFixedCode(data.fixed_code);
        setChanges(data.changes);
        setComplexity(data.complexity);
        setHackerrankCompatible(data.hackerrank_compatible);
      },
      onError: ({ msg }) => {
        setError(msg);
        setIsLoading(false);
      },
      onComplete: () => setIsLoading(false),
    });
    abortRef.current = controller;
  }, [inputCode, hint, effectiveLang, token, isLoading]);

  const handleRun = useCallback(async () => {
    if (!fixedCode || isRunning) return;
    setIsRunning(true);
    setRunOutput('Running…');
    try {
      const response = await fetch(`${API_URL}/api/v1/coding/execute`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: fixedCode, language: effectiveLang, test_cases: [] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || `Error ${response.status}`);
      setRunOutput(data.direct_output || data.output || '(no output)');
    } catch (err: any) {
      setRunOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [fixedCode, effectiveLang, token, isRunning]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(fixedCode);
  }, [fixedCode]);

  const handleSendToCoding = useCallback(() => {
    navigate('/lumora/coding', { state: { cofixCode: fixedCode } });
  }, [fixedCode, navigate]);

  return (
    <div className="flex flex-col h-full">
      {/* Language selector strip */}
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <span className="text-[11px] text-[var(--text-muted)]">Language</span>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          className="text-[11px] bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        >
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT — broken code input */}
        <div className="flex flex-col flex-1 border-r border-[var(--border)]">
          <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            <span className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Broken Code
            </span>
          </div>

          {lineCount > 500 && (
            <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-400">
              CoFix works best on focused snippets — large pastes may produce less precise results.
            </div>
          )}

          <div className="flex-1 min-h-0">
            <SharedCodeEditor
              code={inputCode}
              onChange={setInputCode}
              language={effectiveLang}
              readOnly={false}
              height="100%"
              showLineNumbers
            />
          </div>

          <div className="border-t border-[var(--border)] p-3 bg-[var(--bg-secondary)]">
            <textarea
              value={hint}
              onChange={e => setHint(e.target.value)}
              placeholder="Describe the issue or what's missing (optional)"
              rows={2}
              className="w-full resize-none bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
            <button
              onClick={handleFix}
              disabled={inputCode.trim().length < 5 || isLoading}
              className="w-full py-2.5 rounded-lg bg-[#0047AB] text-white text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0038a0] transition-colors"
            >
              {isLoading ? 'Analyzing…' : '⚡ Fix with CoFix'}
            </button>
          </div>
        </div>

        {/* RIGHT — fixed code + annotations */}
        <div className="flex flex-col flex-1">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            <span className={`text-[10px] font-semibold tracking-wider uppercase ${fixedCode ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
              {fixedCode ? '✓ Fixed Code' : 'Fixed Code'}
            </span>
            {fixedCode && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="text-[11px] px-2 py-1 rounded bg-[#0047AB] text-white border border-[#0047AB] hover:bg-[#0038a0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isRunning ? 'Running…' : '▶ Run'}
                </button>
                <button
                  onClick={handleCopy}
                  className="text-[11px] px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Copy
                </button>
                <button
                  onClick={handleSendToCoding}
                  className="text-[11px] px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Send to Coding →
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Monaco editor — read-only with line decorations */}
            <div className="flex-1 min-w-0 relative">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--bg-primary)]/80 backdrop-blur-sm">
                  <div className="w-5 h-5 border-2 border-[#0047AB] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[12px] text-[var(--text-muted)]">Analyzing…</span>
                </div>
              )}
              {error && !isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--bg-primary)]">
                  <p className="text-[12px] text-red-400">{error}</p>
                  <button
                    onClick={handleFix}
                    className="text-[11px] px-3 py-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
              {fixedCode && changes.length === 0 && !isLoading && (
                <div className="absolute top-3 left-3 right-3 z-10 px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
                  No issues found — code looks correct.
                </div>
              )}
              <Editor
                value={fixedCode}
                language={effectiveLang}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  glyphMargin: false,
                  folding: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
                onMount={editor => { rightEditorRef.current = editor; }}
              />
            </div>

            {changes.length > 0 && <AnnotationPanel changes={changes} />}
          </div>

          {/* Complexity strip */}
          {complexity && (
            <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-secondary)] text-[11px] flex-wrap">
              <span className="text-[var(--text-muted)]">
                Time: <span className="text-[var(--text-primary)]">{complexity.time}</span>
              </span>
              <span className="text-[var(--text-muted)]">
                Space: <span className="text-[var(--text-primary)]">{complexity.space}</span>
              </span>
              {hackerrankCompatible !== null && (
                <span className={hackerrankCompatible ? 'text-emerald-400' : 'text-amber-400'}>
                  {hackerrankCompatible
                    ? '✓ HackerRank Compatible'
                    : '⚠ Contains I/O boilerplate — strip before submitting'}
                </span>
              )}
              <span className="ml-auto text-[var(--text-muted)]">
                {changes.length} change{changes.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Run output strip */}
          {runOutput !== null && (
            <div className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
              <div className="flex items-center justify-between px-4 py-1.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                <span className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">Output</span>
                <button
                  onClick={() => setRunOutput(null)}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  ✕
                </button>
              </div>
              <pre className="px-4 py-3 text-[12px] font-mono text-[var(--text-primary)] whitespace-pre-wrap max-h-40 overflow-y-auto">
                {runOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
