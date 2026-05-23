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
  language:     PlaygroundLanguage;
  defaultValue: string;
  onChange:     (value: string) => void;
  onMount:      (editor: Monaco.editor.IStandaloneCodeEditor) => void;
  explainMode:  boolean;
}

export function PlaygroundEditor({ language, defaultValue, onChange, onMount, explainMode }: Props) {
  const monaco = useMonaco();
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const lintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionsRef = useRef<Monaco.IDisposable | null>(null);
  const hoverDisposable = useRef<Monaco.IDisposable | null>(null);

  function handleChange(value: string | undefined) {
    const v = value ?? '';
    onChange(v);

    if (language === 'python3' && monaco) {
      if (lintTimer.current) clearTimeout(lintTimer.current);
      lintTimer.current = setTimeout(() => runLint(v), 500);
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

  useEffect(() => {
    hoverDisposable.current?.dispose();
    hoverDisposable.current = null;
    if (!monaco || !explainMode) return;

    const monacoLang = MONACO_LANG[language];
    hoverDisposable.current = monaco.languages.registerHoverProvider(monacoLang, {
      provideHover: async (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber).trim();
        if (!lineContent) return null;
        try {
          const result = await playgroundAPI.explain(
            model.getValue(),
            position.lineNumber,
            language
          );
          if (!result.explanation) return null;
          return {
            contents: [
              { value: `**Line ${position.lineNumber}** — *Gemini*` },
              { value: result.explanation },
            ],
          };
        } catch {
          return null;
        }
      },
    });

    return () => { hoverDisposable.current?.dispose(); };
  }, [monaco, language, explainMode]);

  function handleMount(editor: Monaco.editor.IStandaloneCodeEditor) {
    editorRef.current = editor;
    onMount(editor);
  }

  return (
    <Editor
      height="100%"
      language={MONACO_LANG[language]}
      defaultValue={defaultValue}
      onChange={handleChange}
      onMount={handleMount}
      theme="vs-dark"
      options={{
        fontSize: 13,
        fontFamily: '"IBM Plex Mono", "Fira Code", monospace',
        fontLigatures: true,
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
}
