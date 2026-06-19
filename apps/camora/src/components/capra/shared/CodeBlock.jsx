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
  const head = code.split('\n').slice(0, 8).join('\n');
  if (/^apiVersion:|^kind:\s|^metadata:|^\s+spec:|^spec:/.test(head)) return 'yaml';
  if (/^[\s\n]*[{\[][\s\n]*"/.test(head)) return 'json';
  if (/^(FROM |RUN |CMD |EXPOSE |ENV |COPY |ENTRYPOINT |WORKDIR )/m.test(head)) return 'docker';
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|DROP|ALTER TABLE)\b/im.test(head)) return 'sql';
  if (/^(package |import \(|func |type \w+ struct)/.test(head)) return 'go';
  if (/^(pub |fn |use |struct |enum |impl |mod )\b/.test(head)) return 'rust';
  if (/^(def |class \w|import \w|from \w+ import|if __name__)/.test(head)) return 'python';
  if (/^(function |const |let |var |import |export |class \w.*\{)/.test(head)) return 'javascript';
  if (/^(interface |type \w+ =|export (type|interface)|import type)/.test(head)) return 'typescript';
  if (/^(resource |variable |output |provider |terraform)\s+["\w]/.test(head)) return 'hcl';
  if (/^(\$\s|#!\s*\/|sudo |kubectl |docker |helm |apt |yum |brew |npm |pip3? |git )/.test(head)) return 'bash';
  if (/^\s*[-*]\s+\w+:|^\w[\w-]+:\s+\S/.test(head)) return 'yaml';
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
