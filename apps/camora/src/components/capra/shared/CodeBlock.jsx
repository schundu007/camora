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
};

const detectLang = (code) => {
  if (!code || !code.trim()) return 'bash';
  const head = code.split('\n').slice(0, 12).join('\n');
  if (/^apiVersion:|^kind:\s|^metadata:|^\s+spec:|^spec:/m.test(head)) return 'yaml';
  if (/^\s*[{\[]\s*"[\w-]+"\s*:/m.test(head)) return 'json';
  if (/^(FROM|RUN|CMD|EXPOSE|ENV|COPY|ENTRYPOINT|WORKDIR)\s/m.test(head)) return 'docker';
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|DROP|ALTER TABLE)\b/im.test(head)) return 'sql';
  if (/^(package main|import \(|func \w|type \w+ struct)/m.test(head)) return 'go';
  if (/^(pub (fn|struct|enum|impl|mod)|fn \w|use std|impl \w)/m.test(head)) return 'rust';
  if (/^(def |class \w|from \w+ import|if __name__|@\w+\n?def )/m.test(head)) return 'python';
  if (/^(function |const |let |var |import \{|export (default|const)|=>\s*\{)/m.test(head)) return 'javascript';
  if (/^(interface |type \w+ =|export (type|interface)|import type)/m.test(head)) return 'typescript';
  if (/^(resource "|variable "|output "|provider "|terraform \{)/m.test(head)) return 'hcl';
  if (/^(kubectl |helm |docker (run|build|push)|apt-get |yum |brew )/m.test(head)) return 'bash';
  if (/^(\$ |#!\/)/m.test(head)) return 'bash';
  if (/^\w[\w-]+:\s+\S|^\s+-\s+\w[\w-]+:/m.test(head)) return 'yaml';
  return 'bash';
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
  const mapped = LANG_MAP[(lang || '').toLowerCase()];
  const prismLang = mapped ?? detectLang(code);
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
