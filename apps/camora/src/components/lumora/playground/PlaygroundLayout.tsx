import { useState, useRef, useCallback, CSSProperties, useEffect } from 'react';
import { useMonaco } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { LanguageTabs } from './LanguageTabs';
import { PlaygroundEditor } from './PlaygroundEditor';
import { OutputPane, type RunEntry } from './OutputPane';
import { playgroundAPI, type PlaygroundLanguage, type ExplainResult } from '../../../lib/capra-api';

const DEFAULT_CODE: Record<PlaygroundLanguage, string> = {
  python3:   'print("Hello, World!")\n',
  bash:      '#!/usr/bin/env bash\necho "Hello, World!"\n',
  docker:    'FROM ubuntu:22.04\nRUN apt-get update\nCMD ["bash"]\n',
  terraform: 'resource "null_resource" "example" {\n  triggers = {\n    value = "hello"\n  }\n}\n',
};

const sans: CSSProperties = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const mono: CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };

// ---------------------------------------------------------------------------
// Detect input() calls in Python code — returns one label per call
// ---------------------------------------------------------------------------

function detectInputCalls(code: string): string[] {
  const labels: string[] = [];
  const re = /\binput\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  let n = 1;
  while ((m = re.exec(code)) !== null) {
    const arg = m[1].trim();
    const strMatch = arg.match(/^(['"`])([\s\S]*?)\1$/);
    const label = strMatch
      ? strMatch[2].replace(/:?\s*$/, '').trim() || `Input ${n}`
      : `Input ${n}`;
    labels.push(label);
    n++;
  }
  return labels;
}

// ---------------------------------------------------------------------------
// Stdin input modal
// ---------------------------------------------------------------------------

interface InputModalProps {
  labels: string[];
  values: string[];
  onChange: (idx: number, val: string) => void;
  onRun: () => void;
  onCancel: () => void;
}

const InputModal = ({ labels, values, onChange, onRun, onCancel }: InputModalProps) => {
  const firstRef = useRef<HTMLInputElement>(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 shadow-2xl"
        style={{ background: '#0a0e1a', border: '1px solid var(--cam-gold-leaf)' }}
      >
        <p className="text-[11px] uppercase tracking-widest font-semibold mb-4" style={{ color: 'var(--cam-gold-leaf)', ...sans }}>
          Provide Input Values
        </p>

        <div className="flex flex-col gap-3">
          {labels.map((label, i) => (
            <div key={i}>
              <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: '#475569', ...sans }}>
                {label}
              </label>
              <input
                ref={i === 0 ? firstRef : undefined}
                type="text"
                value={values[i] ?? ''}
                onChange={e => onChange(i, e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (i === labels.length - 1) onRun();
                    else (e.currentTarget.closest('.flex')?.querySelector(`input:nth-of-type(${i + 2})`) as HTMLInputElement | null)?.focus();
                  }
                  if (e.key === 'Escape') onCancel();
                }}
                className="w-full px-3 py-2 rounded-md text-sm outline-none"
                style={{
                  background: '#111827',
                  border: '1px solid #1e293b',
                  color: '#e2e8f0',
                  ...mono,
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs rounded-md"
            style={{ background: 'transparent', border: '1px solid #334155', color: '#64748b', ...sans }}
          >
            Cancel
          </button>
          <button
            onClick={onRun}
            className="px-5 py-1.5 text-xs font-bold rounded-md"
            style={{
              background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)',
              color: '#0a0e1a',
              ...sans,
            }}
          >
            ▶ Run
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Explain pane
// ---------------------------------------------------------------------------

interface ExplainState {
  rich: ExplainResult | null;
  loading: boolean;
  line: number;
  error: string | null;
}

const ExplainPane = ({ rich, loading, line, error }: ExplainState) => {
  if (!line) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: '#475569', ...sans }}>
        <span className="text-[28px]">↑</span>
        <span className="text-[13px]">Move cursor to any line</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0d12] overflow-auto">
      <div className="px-4 py-2 border-b border-[#1e293b] sticky top-0 bg-[#0a0d12] flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-widest text-[#334155] font-medium" style={sans}>Line {line}</span>
        {loading && (
          <span className="w-2.5 h-2.5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />
        )}
      </div>

      <div className="px-4 py-4 flex-1 space-y-5">
        {error ? (
          <p className="text-[#f87171] text-[12px] leading-relaxed" style={sans}>{error}</p>
        ) : loading ? (
          <p className="text-[#475569] text-[11px] italic" style={sans}>Analysing…</p>
        ) : rich ? (
          <>
            {/* What it does */}
            {(rich.what || rich.explanation) && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#3b82f6', ...sans }}>What it does</div>
                <p className="text-[13px] leading-relaxed" style={{ color: '#cbd5e1', ...sans }}>{rich.what || rich.explanation}</p>
              </div>
            )}

            {/* How it works */}
            {rich.how && rich.how.length > 0 && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#3b82f6', ...sans }}>How it works</div>
                <div className="rounded-lg overflow-hidden border border-[#1e293b]">
                  {rich.how.map((step, i) => (
                    <div key={i} className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', borderTop: i > 0 ? '1px solid #1e293b' : 'none' }}>
                      <div className="px-3 py-2.5" style={{ background: '#0d1117', borderRight: '1px solid #1e293b' }}>
                        <pre className="text-[11px] leading-relaxed" style={{ fontFamily: 'var(--font-mono)', color: '#e6edf3', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{step.code}</pre>
                      </div>
                      <div className="px-3 py-2.5 flex items-start gap-2">
                        <span className="shrink-0 mt-0.5 text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                        <span className="text-[12px] leading-relaxed" style={{ color: '#94a3b8', ...sans }}>{step.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* State trace */}
            {rich.trace && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#d97706', ...sans }}>State trace</div>
                <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)' }}>
                  <pre className="text-[11px] leading-relaxed" style={{ fontFamily: 'var(--font-mono)', color: '#fcd34d', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{rich.trace}</pre>
                </div>
              </div>
            )}

            {/* Analogy */}
            {rich.analogy && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#a78bfa', ...sans }}>Think of it as…</div>
                <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)' }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: '#c4b5fd', ...sans }}>{rich.analogy}</p>
                </div>
              </div>
            )}

            {/* Concepts */}
            {rich.concepts && rich.concepts.length > 0 && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#334155', ...sans }}>Concepts used</div>
                <div className="flex flex-wrap gap-1.5">
                  {rich.concepts.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: 'rgba(51,65,85,0.6)', color: '#94a3b8', ...sans }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-[#475569] text-[11px] italic" style={sans}>No explanation yet</p>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main layout
// ---------------------------------------------------------------------------

export const PlaygroundLayout = () => {
  const [activeTab, setActiveTab]   = useState<PlaygroundLanguage>('python3');
  const [running, setRunning]       = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [copied, setCopied]         = useState(false);
  const [explainMode, setExplainMode] = useState(false);
  const [rightTab, setRightTab]     = useState<'output' | 'explain'>('output');
  const [runs, setRuns]             = useState<RunEntry[]>([]);
  const [explain, setExplain]       = useState<ExplainState>({ rich: null, loading: false, line: 0, error: null });
  const [inputModal, setInputModal] = useState<{ labels: string[]; values: string[] } | null>(null);

  const codeRef        = useRef<Record<PlaygroundLanguage, string>>({ ...DEFAULT_CODE });
  const editorRef      = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoInst     = useMonaco();
  const explainTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentLineRef = useRef(1);

  const fetchExplain = useCallback((line: number, code: string, lang: PlaygroundLanguage) => {
    if (explainTimer.current) clearTimeout(explainTimer.current);
    explainTimer.current = setTimeout(async () => {
      setExplain(prev => ({ ...prev, loading: true, error: null }));
      try {
        const r = await playgroundAPI.explain(code, line, lang);
        setExplain(prev => ({ ...prev, rich: r, loading: false }));
      } catch {
        setExplain(prev => ({ ...prev, error: 'Explanation unavailable.', loading: false, rich: null }));
      }
    }, 500);
  }, []);

  const handleCursorChange = useCallback((line: number, code: string) => {
    currentLineRef.current = line;
    setExplain(prev => (prev.line === line ? prev : { ...prev, line }));
    if (explainMode) fetchExplain(line, code, activeTab);
  }, [explainMode, activeTab, fetchExplain]);

  const handleToggleExplain = useCallback(() => {
    setExplainMode(prev => {
      const next = !prev;
      setRightTab(next ? 'explain' : 'output');
      if (next) {
        const line = currentLineRef.current;
        const code = editorRef.current?.getValue() || codeRef.current[activeTab];
        setExplain(s => ({ ...s, line, loading: true, error: null }));
        playgroundAPI.explain(code, line, activeTab)
          .then(r => setExplain(s => ({ ...s, rich: r, loading: false })))
          .catch(() => setExplain(s => ({ ...s, error: 'Explanation unavailable.', loading: false, rich: null })));
      }
      return next;
    });
  }, [activeTab]);

  const handleCodeChange = useCallback((value: string) => {
    codeRef.current[activeTab] = value;
    if (explainMode) {
      setExplain(prev => ({ ...prev, rich: null, error: null }));
      fetchExplain(currentLineRef.current, value, activeTab);
    }
  }, [activeTab, explainMode, fetchExplain]);

  // Core execution — called with the final stdin string
  const doRun = useCallback(async (code: string, stdin: string) => {
    setRunning(true);
    setRightTab('output');
    try {
      const r = await playgroundAPI.run({ language: activeTab, code, stdin });
      setRuns(prev => [...prev, { ts: new Date(), result: r, error: null }]);
    } catch (err: unknown) {
      setRuns(prev => [...prev, { ts: new Date(), result: null, error: err instanceof Error ? err.message : 'Execution failed' }]);
    } finally {
      setRunning(false);
    }
  }, [activeTab]);

  const handleRun = useCallback(async () => {
    const code = codeRef.current[activeTab];

    // For Python, detect input() calls and prompt user before running
    if (activeTab === 'python3') {
      const labels = detectInputCalls(code);
      if (labels.length > 0) {
        setInputModal({ labels, values: new Array(labels.length).fill('') });
        return;
      }
    }

    doRun(code, '');
  }, [activeTab, doRun]);

  const handleModalRun = useCallback(() => {
    if (!inputModal) return;
    const code = codeRef.current[activeTab];
    const stdin = inputModal.values.map(v => v + '\n').join('');
    setInputModal(null);
    doRun(code, stdin);
  }, [inputModal, activeTab, doRun]);

  const handleModalChange = useCallback((idx: number, val: string) => {
    setInputModal(prev => {
      if (!prev) return prev;
      const values = [...prev.values];
      values[idx] = val;
      return { ...prev, values };
    });
  }, []);

  const handleFormat = useCallback(async () => {
    if (activeTab === 'docker') return;
    const code = codeRef.current[activeTab];
    setFormatting(true);
    try {
      const r = await playgroundAPI.format(code, activeTab);
      codeRef.current[activeTab] = r.code;
      editorRef.current?.setValue(r.code);
    } catch {
      // format is best-effort
    } finally {
      setFormatting(false);
    }
  }, [activeTab]);

  const handleCopy = useCallback(() => {
    const code = editorRef.current?.getValue() ?? codeRef.current[activeTab];
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [activeTab]);

  const handleClear = useCallback(() => {
    setRuns([]);
  }, []);

  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    if (monacoInst) {
      editor.addCommand(monacoInst.KeyMod.CtrlCmd | monacoInst.KeyCode.Enter, () => handleRun());
      editor.addCommand(monacoInst.KeyMod.CtrlCmd | monacoInst.KeyCode.KeyL,  () => handleClear());
      editor.addCommand(monacoInst.KeyMod.CtrlCmd | monacoInst.KeyCode.KeyD,  () => handleFormat());
    }
  }, [monacoInst, handleRun, handleClear, handleFormat]);

  const handleTabChange = useCallback((lang: PlaygroundLanguage) => {
    setActiveTab(lang);
    setRuns([]);
    setInputModal(null);
  }, []);

  const tabBtn = (label: string, tab: 'output' | 'explain') => (
    <button
      onClick={() => setRightTab(tab)}
      className="px-4 py-2 text-[10px] uppercase tracking-widest font-medium border-b-2 transition-colors"
      style={{
        ...sans,
        borderColor: rightTab === tab ? 'var(--cam-gold-leaf)' : 'transparent',
        color: rightTab === tab ? 'var(--cam-gold-leaf)' : '#475569',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#111318] text-white">
      {inputModal && (
        <InputModal
          labels={inputModal.labels}
          values={inputModal.values}
          onChange={handleModalChange}
          onRun={handleModalRun}
          onCancel={() => setInputModal(null)}
        />
      )}

      <LanguageTabs active={activeTab} onChange={handleTabChange} />

      {/* Toolbar */}
      <div className="flex items-center px-4 py-2 bg-[#0a0e1a] border-b border-[var(--cam-gold-leaf-dk)]">
        <div className="flex-1">
          <span className="text-[10px] text-[var(--cam-gold-leaf-dk)] uppercase tracking-widest font-medium" style={sans}>
            {activeTab === 'python3' ? 'main.py' : activeTab === 'bash' ? 'script.sh' : activeTab === 'docker' ? 'Dockerfile' : 'main.tf'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== 'docker' && (
            <button
              onClick={handleFormat}
              disabled={formatting}
              className="text-[11px] font-semibold px-3 py-1 rounded-md transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{
                ...sans,
                background: 'linear-gradient(135deg, rgba(0,47,120,0.55) 0%, rgba(10,14,26,0.85) 100%)',
                border: '1px solid var(--cam-gold-leaf)',
                color: 'var(--cam-gold-leaf)',
              }}
            >
              {formatting ? 'Formatting…' : 'Format'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="text-[11px] font-semibold px-3 py-1 rounded-md transition-all hover:opacity-90"
            style={copied ? {
              ...sans,
              background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 100%)',
              border: '1px solid var(--cam-gold-leaf)',
              color: '#0a0e1a',
            } : {
              ...sans,
              background: 'linear-gradient(135deg, rgba(0,47,120,0.35) 0%, rgba(10,14,26,0.75) 100%)',
              border: '1px solid var(--cam-gold-leaf-dk)',
              color: 'var(--cam-gold-leaf-dk)',
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleToggleExplain}
            className="text-[11px] font-semibold px-3 py-1 rounded-md transition-opacity hover:opacity-90"
            style={explainMode ? {
              ...sans,
              background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 100%)',
              border: '1px solid var(--cam-gold-leaf)',
              color: '#0a0e1a',
            } : {
              ...sans,
              background: 'linear-gradient(135deg, rgba(0,47,120,0.35) 0%, rgba(10,14,26,0.75) 100%)',
              border: '1px solid var(--cam-gold-leaf-dk)',
              color: 'var(--cam-gold-leaf-dk)',
            }}
          >
            Explain
          </button>
          <button
            onClick={handleClear}
            className="text-[11px] font-semibold px-3 py-1 rounded-md transition-opacity hover:opacity-90"
            style={{
              ...sans,
              background: 'linear-gradient(135deg, rgba(0,47,120,0.35) 0%, rgba(10,14,26,0.75) 100%)',
              border: '1px solid var(--cam-gold-leaf-dk)',
              color: 'var(--cam-gold-leaf-dk)',
            }}
          >
            Clear
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="text-[11px] font-bold px-5 py-1.5 rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              ...sans,
              background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)',
              color: '#0a0e1a',
            }}
          >
            {running ? 'Running…' : '▶ Run'}
          </button>
        </div>
        <div className="flex-1 flex items-center justify-end">
          <span className="text-[10px] text-[var(--cam-gold-leaf-dk)] hidden md:block" style={sans}>⌘↵ · ⌘L · ⌘D</span>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="w-1/2 border-r border-[#1e293b] overflow-hidden">
          <PlaygroundEditor
            key={activeTab}
            language={activeTab}
            defaultValue={codeRef.current[activeTab]}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
            onCursorChange={handleCursorChange}
          />
        </div>

        {/* Right pane: Output | Explain */}
        <div className="w-1/2 overflow-hidden flex flex-col">
          {explainMode && (
            <div className="flex border-b border-[#1e293b] bg-[#0a0d12] shrink-0">
              {tabBtn('Output', 'output')}
              {tabBtn('Explain', 'explain')}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {rightTab === 'explain' && explainMode ? (
              <ExplainPane {...explain} />
            ) : (
              <OutputPane runs={runs} language={activeTab} onClear={() => setRuns([])} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
