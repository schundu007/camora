import { useState, useRef, useCallback, CSSProperties } from 'react';
import { useMonaco } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { LanguageTabs } from './LanguageTabs';
import { PlaygroundEditor } from './PlaygroundEditor';
import { OutputPane } from './OutputPane';
import { playgroundAPI, type PlaygroundLanguage, type PlaygroundRunResult } from '../../../lib/capra-api';

const DEFAULT_CODE: Record<PlaygroundLanguage, string> = {
  python3:   'print("Hello, World!")\n',
  bash:      '#!/usr/bin/env bash\necho "Hello, World!"\n',
  docker:    'FROM ubuntu:22.04\nRUN apt-get update\nCMD ["bash"]\n',
  terraform: 'resource "null_resource" "example" {\n  triggers = {\n    value = "hello"\n  }\n}\n',
};

const sans: CSSProperties = { fontFamily: 'Plus Jakarta Sans, sans-serif' };

interface ExplainState {
  text: string;
  loading: boolean;
  line: number;
  error: string | null;
}

const ExplainPane = ({ text, loading, line, error }: ExplainState) => {
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
        <span className="text-[9px] uppercase tracking-widest text-[#334155] font-medium" style={sans}>
          Line {line}
        </span>
        {loading && (
          <span
            className="w-2.5 h-2.5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }}
          />
        )}
      </div>
      <div className="px-4 py-4 flex-1">
        {error ? (
          <p className="text-[#f87171] text-[12px] leading-relaxed" style={sans}>{error}</p>
        ) : loading ? (
          <p className="text-[#475569] text-[11px] italic" style={sans}>Fetching explanation…</p>
        ) : text ? (
          <p className="text-[#e2e8f0] text-[14px] leading-relaxed" style={sans}>{text}</p>
        ) : (
          <p className="text-[#475569] text-[11px] italic" style={sans}>No explanation yet</p>
        )}
      </div>
    </div>
  );
};

export const PlaygroundLayout = () => {
  const [activeTab, setActiveTab]   = useState<PlaygroundLanguage>('python3');
  const [running, setRunning]       = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [explainMode, setExplainMode] = useState(false);
  const [rightTab, setRightTab]     = useState<'output' | 'explain'>('output');
  const [result, setResult]         = useState<PlaygroundRunResult | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [explain, setExplain]       = useState<ExplainState>({ text: '', loading: false, line: 0, error: null });

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
        setExplain(prev => ({ ...prev, text: r.explanation || '', loading: false }));
      } catch {
        setExplain(prev => ({ ...prev, error: 'Explanation unavailable.', loading: false, text: '' }));
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
          .then(r => setExplain(s => ({ ...s, text: r.explanation || '', loading: false })))
          .catch(() => setExplain(s => ({ ...s, error: 'Explanation unavailable.', loading: false, text: '' })));
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
    setError(null);
    setRightTab('output');
    try {
      const r = await playgroundAPI.run({ language: activeTab, code });
      setResult(r);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setRunning(false);
    }
  }, [activeTab]);

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

  const handleClear = useCallback(() => {
    setResult(null);
    setError(null);
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
    setResult(null);
    setError(null);
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
              <OutputPane result={result} error={error} language={activeTab} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
