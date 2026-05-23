import { useState, useRef, useCallback } from 'react';
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

export function PlaygroundLayout() {
  const [activeTab, setActiveTab]   = useState<PlaygroundLanguage>('python3');
  const [running, setRunning]       = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [result, setResult]         = useState<PlaygroundRunResult | null>(null);
  const [error, setError]           = useState<string | null>(null);

  // Per-tab code state — useRef so tab switching preserves edits
  const codeRef    = useRef<Record<PlaygroundLanguage, string>>({ ...DEFAULT_CODE });
  const editorRef  = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoInst = useMonaco();

  const handleCodeChange = useCallback((value: string) => {
    codeRef.current[activeTab] = value;
  }, [activeTab]);

  const handleRun = useCallback(async () => {
    const code = codeRef.current[activeTab];
    setRunning(true);
    setError(null);
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
    if (activeTab !== 'python3') return;
    const code = codeRef.current.python3;
    setFormatting(true);
    try {
      const r = await playgroundAPI.format(code);
      codeRef.current.python3 = r.code;
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
    // Wire keyboard shortcuts after monacoInst is available
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

  return (
    <div className="flex flex-col h-full bg-[#111318] text-white">
      <LanguageTabs active={activeTab} onChange={handleTabChange} />

      {/* Toolbar — filename left, Run centered, secondary actions right */}
      <div className="flex items-center px-4 py-2 bg-[#0a0e1a] border-b border-[var(--cam-gold-leaf-dk)]">
        {/* LEFT: filename chip */}
        <div className="flex-1">
          <span
            className="text-[10px] text-[var(--cam-gold-leaf-dk)] uppercase tracking-widest font-medium"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            {activeTab === 'python3' ? 'main.py' : activeTab === 'bash' ? 'script.sh' : activeTab === 'docker' ? 'Dockerfile' : 'main.tf'}
          </span>
        </div>
        {/* CENTER: action chips + Run */}
        <div className="flex items-center gap-2">
          {activeTab === 'python3' && (
            <button
              onClick={handleFormat}
              disabled={formatting}
              className="text-[11px] px-3 py-1 rounded-md border border-[var(--cam-gold-leaf)] text-[var(--cam-gold-leaf)] hover:opacity-80 transition-opacity disabled:opacity-40"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {formatting ? 'Formatting…' : 'Format'}
            </button>
          )}
          <button
            onClick={handleClear}
            className="text-[11px] px-3 py-1 rounded-md border border-[var(--cam-gold-leaf)] text-[var(--cam-gold-leaf)] opacity-60 hover:opacity-100 transition-opacity"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Clear
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="text-[11px] px-5 py-1.5 rounded-md font-semibold bg-[var(--cam-gold-leaf)] text-[#0a0e1a] hover:bg-[var(--cam-gold-leaf-lt)] transition-colors disabled:opacity-50"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            {running ? 'Running…' : '▶ Run'}
          </button>
        </div>
        {/* RIGHT: shortcut hint */}
        <div className="flex-1 flex items-center justify-end">
          <span className="text-[10px] text-[var(--cam-gold-leaf-dk)] hidden md:block" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            ⌘↵ · ⌘L · ⌘D
          </span>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-[#1e293b] overflow-hidden">
          <PlaygroundEditor
            key={activeTab}
            language={activeTab}
            defaultValue={codeRef.current[activeTab]}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
          />
        </div>
        <div className="w-1/2 overflow-hidden">
          <OutputPane result={result} error={error} language={activeTab} />
        </div>
      </div>
    </div>
  );
}
