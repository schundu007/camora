import { useEffect, useRef } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { playgroundAPI, type PlaygroundLanguage, type LintDiagnostic } from '../../../lib/capra-api';
import { registerPlaygroundCompletions } from './playgroundCompletions';

const MONACO_LANG: Record<PlaygroundLanguage, string> = {
  python3:   'python',
  bash:      'shell',
  docker:    'dockerfile',
  terraform: 'hcl',
};

interface Props {
  language:        PlaygroundLanguage;
  defaultValue:    string;
  onChange:        (value: string) => void;
  onMount:         (editor: Monaco.editor.IStandaloneCodeEditor) => void;
  onCursorChange?: (line: number, code: string) => void;
  theme?:          'vs' | 'vs-dark';
}

export const PlaygroundEditor = ({ language, defaultValue, onChange, onMount, onCursorChange, theme = 'vs-dark' }: Props) => {
  const monaco = useMonaco();
  const editorRef      = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const lintTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionsRef = useRef<Monaco.IDisposable | null>(null);

  function handleChange(value: string | undefined) {
    const v = value ?? '';
    onChange(v);
    if (language === 'python3' && monaco) {
      if (lintTimer.current) clearTimeout(lintTimer.current);
      lintTimer.current = setTimeout(() => runLint(v), 2000);
    }
  }

  async function runLint(code: string) {
    if (!monaco || !editorRef.current) return;
    try {
      const { diagnostics } = await playgroundAPI.lint(code, language);
      const model = editorRef.current.getModel();
      if (!model) return;
      monaco.editor.setModelMarkers(
        model,
        'ruff',
        diagnostics.map((d: LintDiagnostic) => ({
          startLineNumber: d.line,
          startColumn:     d.col,
          endLineNumber:   d.endLine,
          endColumn:       d.endCol,
          message:         `[${d.code}] ${d.message}`,
          severity:        monaco.MarkerSeverity.Warning,
        }))
      );
    } catch {
      // lint is best-effort
    }
  }

  useEffect(() => {
    if (!monaco || !editorRef.current) return;
    const model = editorRef.current.getModel();
    if (model) monaco.editor.setModelMarkers(model, 'ruff', []);
  }, [language, monaco]);

  useEffect(() => {
    if (!monaco) return;
    completionsRef.current?.dispose();
    completionsRef.current = registerPlaygroundCompletions(monaco);
    return () => { completionsRef.current?.dispose(); };
  }, [monaco]);

  function handleMount(editor: Monaco.editor.IStandaloneCodeEditor) {
    editorRef.current = editor;
    onMount(editor);
    editor.onDidChangeCursorPosition(e => {
      onCursorChange?.(e.position.lineNumber, editor.getValue());
    });
  }

  return (
    <Editor
      height="100%"
      language={MONACO_LANG[language]}
      defaultValue={defaultValue}
      onChange={handleChange}
      onMount={handleMount}
      beforeMount={(m) => { m.editor.setTheme(theme); }}
      theme={theme}
      options={{
        fontSize: 11,
        fontFamily: '"IBM Plex Mono", "Cascadia Code", monospace',
        fontLigatures: true,
        letterSpacing: -0.3,
        lineHeight: 19,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 12, bottom: 12 },
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        tabSize: 4,
        insertSpaces: true,
        wordWrap: 'on',
        automaticLayout: true,
        autoIndent: 'full',
        formatOnType: true,
        snippetSuggestions: 'top',
        acceptSuggestionOnEnter: 'smart',
        suggest: { showSnippets: true, showKeywords: true },
      }}
    />
  );
};
