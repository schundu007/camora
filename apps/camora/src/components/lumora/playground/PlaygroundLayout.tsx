import { useState, useRef, useCallback, CSSProperties } from 'react';
import { useMonaco } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { LanguageTabs } from './LanguageTabs';
import { PlaygroundEditor } from './PlaygroundEditor';
import { OutputPane, type RunEntry } from './OutputPane';
import { CustomInputPanel } from '../../shared/CustomInputPanel';
import { playgroundAPI, type PlaygroundLanguage, type ExplainResult } from '../../../lib/capra-api';

const DEFAULT_CODE: Record<PlaygroundLanguage, string> = {
  python3:   'print("Hello, World!")\n',
  bash:      '#!/usr/bin/env bash\necho "Hello, World!"\n',
  docker:    'FROM ubuntu:22.04\nRUN apt-get update\nCMD ["bash"]\n',
  terraform: 'resource "null_resource" "example" {\n  triggers = {\n    value = "hello"\n  }\n}\n',
};

const sans: CSSProperties = { fontFamily: 'var(--font-sans)' };

interface ExplainState {
  rich: ExplainResult | null;
  loading: boolean;
  line: number;
  error: string | null;
}

const ExplainPane = ({ rich, loading, line, error }: ExplainState) => {
  if (!line) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: '#7C8AA0', ...sans }}>
        <span className="text-[28px]">↑</span>
        <span className="text-[13px]">Move cursor to any line</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0d12] overflow-auto">
      <div className="px-4 py-2 border-b border-[#1e293b] sticky top-0 bg-[#0a0d12] flex items-center gap-2 lumora-winctl-safe">
        <span className="text-[12px] uppercase tracking-widest text-[#6B7A90] font-medium" style={sans}>Line {line}</span>
        {loading && (
          <span className="w-2.5 h-2.5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />
        )}
      </div>

      <div className="px-4 py-4 flex-1 space-y-5">
        {error ? (
          <p className="text-[#f87171] text-[12px] leading-relaxed" style={sans}>{error}</p>
        ) : loading ? (
          <p className="text-[#7C8AA0] text-[12px] italic" style={sans}>Analysing…</p>
        ) : rich ? (
          <>
            {/* What it does */}
            {(rich.what || rich.explanation) && (
              <div>
                <div className="text-[12px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#3b82f6', ...sans }}>What it does</div>
                <p className="text-[13px] leading-relaxed" style={{ color: '#cbd5e1', ...sans }}>{rich.what || rich.explanation}</p>
              </div>
            )}

            {/* How it works */}
            {rich.how && rich.how.length > 0 && (
              <div>
                <div className="text-[12px] font-bold uppercase tracking-widest mb-2" style={{ color: '#3b82f6', ...sans }}>How it works</div>
                <div className="rounded-lg overflow-hidden border border-[#1e293b]">
                  {rich.how.map((step, i) => (
                    <div key={i} className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', borderTop: i > 0 ? '1px solid #1e293b' : 'none' }}>
                      <div className="px-3 py-2.5" style={{ background: '#0d1117', borderRight: '1px solid #1e293b' }}>
                        <pre className="text-[14px] leading-relaxed" style={{ fontFamily: 'var(--font-mono)', color: '#e6edf3', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{step.code}</pre>
                      </div>
                      <div className="px-3 py-2.5 flex items-start gap-2">
                        <span className="shrink-0 mt-0.5 text-[12px] font-bold w-4 h-4 rounded flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
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
                <div className="text-[12px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#d97706', ...sans }}>State trace</div>
                <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)' }}>
                  <pre className="text-[14px] leading-relaxed" style={{ fontFamily: 'var(--font-mono)', color: '#fcd34d', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{rich.trace}</pre>
                </div>
              </div>
            )}

            {/* Analogy */}
            {rich.analogy && (
              <div>
                <div className="text-[12px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#a78bfa', ...sans }}>Think of it as…</div>
                <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)' }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: '#c4b5fd', ...sans }}>{rich.analogy}</p>
                </div>
              </div>
            )}

            {/* Concepts */}
            {rich.concepts && rich.concepts.length > 0 && (
              <div>
                <div className="text-[12px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#6B7A90', ...sans }}>Concepts used</div>
                <div className="flex flex-wrap gap-1.5">
                  {rich.concepts.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[12px] font-medium" style={{ background: 'rgba(51,65,85,0.6)', color: '#94a3b8', ...sans }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-[#7C8AA0] text-[12px] italic" style={sans}>No explanation yet</p>
        )}
      </div>
    </div>
  );
};

export const PlaygroundLayout = () => {
  const [activeTab, setActiveTab]   = useState<PlaygroundLanguage>('python3');
  const [running, setRunning]       = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [copied, setCopied]         = useState(false);
  const [explainMode, setExplainMode] = useState(false);
  const [rightTab, setRightTab]     = useState<'output' | 'explain'>('output');
  const [runs, setRuns]             = useState<RunEntry[]>([]);
  const [customInputEnabled, setCustomInputEnabled] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const supportsStdin = activeTab === 'python3' || activeTab === 'bash';
  const [explain, setExplain]       = useState<ExplainState>({ rich: null, loading: false, line: 0, error: null });

  const codeRef       = useRef<Record<PlaygroundLanguage, string>>({ ...DEFAULT_CODE });
  const editorRef     = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoInst    = useMonaco();
  const explainTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  }, [activeTab]);

  const handleRun = useCallback(async () => {
    const code = codeRef.current[activeTab];
    setRunning(true);
    setRightTab('output');
    try {
      const useStdin = customInputEnabled && (activeTab === 'python3' || activeTab === 'bash');
      const r = await playgroundAPI.run({ language: activeTab, code, stdin: useStdin ? customInput : undefined });
      setRuns(prev => [...prev, { ts: new Date(), result: r, error: null }]);
    } catch (err: unknown) {
      setRuns(prev => [...prev, { ts: new Date(), result: null, error: err instanceof Error ? err.message : 'Execution failed' }]);
    } finally {
      setRunning(false);
    }
  }, [activeTab, customInputEnabled, customInput]);

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
  }, []);

  const tabBtn = (label: string, tab: 'output' | 'explain') => (
    <button
      onClick={() => setRightTab(tab)}
      className="px-4 py-2 text-[12px] uppercase tracking-widest font-medium border-b-2 transition-colors"
      style={{
        ...sans,
        borderColor: rightTab === tab ? 'var(--cam-gold-leaf)' : 'transparent',
        color: rightTab === tab ? 'var(--cam-gold-leaf)' : '#7C8AA0',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#111318] text-white">
      <LanguageTabs active={activeTab} onChange={handleTabChange} />

      {/* Toolbar */}
      <div className="flex items-center px-4 py-2 bg-[#0a0e1a] border-b border-[var(--cam-gold-leaf-dk)]">
        <div className="flex-1">
          <span className="text-[12px] text-[var(--cam-gold-leaf-dk)] uppercase tracking-widest font-medium" style={sans}>
            {activeTab === 'python3' ? 'main.py' : activeTab === 'bash' ? 'script.sh' : activeTab === 'docker' ? 'Dockerfile' : 'main.tf'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== 'docker' && (
            <button
              onClick={handleFormat}
              disabled={formatting}
              className="text-[12px] font-semibold px-3 py-1 rounded-md transition-opacity hover:opacity-90 disabled:opacity-40"
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
            className="text-[12px] font-semibold px-3 py-1 rounded-md transition-all hover:opacity-90"
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
            className="text-[12px] font-semibold px-3 py-1 rounded-md transition-opacity hover:opacity-90"
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
            className="text-[12px] font-semibold px-3 py-1 rounded-md transition-opacity hover:opacity-90"
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
            className="text-[12px] font-bold px-5 py-1.5 rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
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
          <span className="text-[12px] text-[var(--cam-gold-leaf-dk)] hidden md:block" style={sans}>⌘↵ · ⌘L · ⌘D</span>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="w-1/2 border-r border-[#1e293b] overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <PlaygroundEditor
              key={activeTab}
              language={activeTab}
              defaultValue={codeRef.current[activeTab]}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
              onCursorChange={handleCursorChange}
            />
          </div>
          {supportsStdin && (
            <div className="shrink-0 border-t border-[#1e293b] px-3 py-2 bg-[#0a0d12]">
              <CustomInputPanel
                enabled={customInputEnabled}
                value={customInput}
                onToggle={setCustomInputEnabled}
                onChange={setCustomInput}
                disabled={running}
              />
            </div>
          )}
        </div>

        {/* Right pane: Output | Explain */}
        <div className="w-1/2 overflow-hidden flex flex-col">
          {/* Tab bar — always visible when explain mode on, hidden otherwise */}
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
