import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const LANG_MAP = {
  bash: 'bash', shell: 'bash', sh: 'bash', zsh: 'bash',
  yaml: 'yaml', yml: 'yaml',
  json: 'json',
  python: 'python', py: 'python',
  javascript: 'javascript', js: 'javascript',
  typescript: 'typescript', ts: 'typescript',
  go: 'go',
  sql: 'sql',
  dockerfile: 'docker', docker: 'docker',
  terraform: 'hcl', hcl: 'hcl', tf: 'hcl',
  toml: 'toml',
  xml: 'markup', html: 'markup',
  css: 'css',
  nginx: 'nginx',
  rust: 'rust',
  java: 'java',
  cpp: 'cpp', 'c++': 'cpp',
  c: 'c',
  ruby: 'ruby', rb: 'ruby',
  php: 'php',
  kotlin: 'kotlin',
  swift: 'swift',
  code: 'text', text: 'text',
};

const codeTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: '#0d1117',
    margin: 0,
    padding: '14px 16px',
    fontSize: '12.5px',
    lineHeight: '1.6',
    borderRadius: 0,
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
    fontSize: '12.5px',
  },
};

export default function CodeBlock({ code, lang, bare = false }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const prismLang = LANG_MAP[(lang || '').toLowerCase()] || 'text';
  return (
    <div className="prep-code-block">
      {!bare && (
        <div className="prep-code-header">
          <span className="prep-code-lang">{lang || 'code'}</span>
          <button className="prep-code-copy" onClick={handleCopy}>
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
      )}
      <SyntaxHighlighter language={prismLang} style={codeTheme} wrapLongLines={false}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
