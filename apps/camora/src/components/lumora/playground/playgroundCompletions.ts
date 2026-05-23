import type * as Monaco from 'monaco-editor';

// ── Python ──────────────────────────────────────────────────────────────────

const PYTHON_KEYWORDS = [
  'False','None','True','and','as','assert','async','await',
  'break','class','continue','def','del','elif','else','except',
  'finally','for','from','global','if','import','in','is',
  'lambda','nonlocal','not','or','pass','raise','return',
  'try','while','with','yield',
];

const PYTHON_BUILTINS = [
  'abs','all','any','bin','bool','callable','chr','dict',
  'dir','divmod','enumerate','eval','exec','filter','float',
  'format','frozenset','getattr','globals','hasattr','hash',
  'hex','id','input','int','isinstance','issubclass','iter',
  'len','list','locals','map','max','min','next','object',
  'oct','open','ord','pow','print','property','range','repr',
  'reversed','round','set','setattr','slice','sorted',
  'staticmethod','str','sum','super','tuple','type','vars','zip',
];

const PYTHON_SNIPPETS = [
  { label: 'def',          detail: 'Function definition',  insertText: 'def ${1:name}(${2:args}):\n\t${0:pass}' },
  { label: 'class',        detail: 'Class definition',     insertText: 'class ${1:Name}:\n\tdef __init__(self):\n\t\t${0:pass}' },
  { label: 'main',         detail: 'Main guard',           insertText: "if __name__ == '__main__':\n\t${0:main()}" },
  { label: 'for',          detail: 'For loop',             insertText: 'for ${1:item} in ${2:iterable}:\n\t${0:pass}' },
  { label: 'forrange',     detail: 'For range loop',       insertText: 'for ${1:i} in range(${2:10}):\n\t${0:pass}' },
  { label: 'while',        detail: 'While loop',           insertText: 'while ${1:condition}:\n\t${0:pass}' },
  { label: 'if',           detail: 'If statement',         insertText: 'if ${1:condition}:\n\t${0:pass}' },
  { label: 'ifelse',       detail: 'If/else statement',    insertText: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${0:pass}' },
  { label: 'try',          detail: 'Try/except',           insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${0:pass}' },
  { label: 'tryfinally',   detail: 'Try/except/finally',   insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}\nfinally:\n\t${0:pass}' },
  { label: 'with',         detail: 'With/open',            insertText: "with open('${1:file}', '${2:r}') as ${3:f}:\n\t${0:pass}" },
  { label: 'lambda',       detail: 'Lambda function',      insertText: 'lambda ${1:args}: ${0:expr}' },
  { label: 'property',     detail: '@property',            insertText: '@property\ndef ${1:name}(self):\n\treturn self._${1:name}' },
  { label: 'staticmethod', detail: '@staticmethod',        insertText: '@staticmethod\ndef ${1:name}(${2:args}):\n\t${0:pass}' },
  { label: 'classmethod',  detail: '@classmethod',         insertText: '@classmethod\ndef ${1:name}(cls):\n\t${0:pass}' },
  { label: 'import',       detail: 'Import module',        insertText: 'import ${0:module}' },
  { label: 'from import',  detail: 'From import',          insertText: 'from ${1:module} import ${0:name}' },
];

function registerPython(monaco: typeof Monaco): Monaco.IDisposable {
  const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;
  return monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
        startColumn: word.startColumn,        endColumn: word.endColumn,
      };
      const snippets: Monaco.languages.CompletionItem[] = PYTHON_SNIPPETS.map(s => ({
        label: s.label, kind: CompletionItemKind.Snippet, detail: s.detail,
        insertText: s.insertText, insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet, range,
      }));
      const keywords: Monaco.languages.CompletionItem[] = PYTHON_KEYWORDS.map(kw => ({
        label: kw, kind: CompletionItemKind.Keyword, insertText: kw, range,
      }));
      const builtins: Monaco.languages.CompletionItem[] = PYTHON_BUILTINS.map(b => ({
        label: b, kind: CompletionItemKind.Function, detail: 'builtin', insertText: b, range,
      }));
      return { suggestions: [...snippets, ...keywords, ...builtins] };
    },
  });
}

// ── Bash ────────────────────────────────────────────────────────────────────

const BASH_SNIPPETS = [
  { label: 'shebang',  detail: 'Shebang + strict mode', insertText: '#!/usr/bin/env bash\nset -euo pipefail\n\n${0}' },
  { label: 'if',       detail: 'If statement',          insertText: 'if ${1:condition}; then\n\t${2:echo "yes"}\nfi' },
  { label: 'ifelse',   detail: 'If/else statement',     insertText: 'if ${1:condition}; then\n\t${2:echo "yes"}\nelse\n\t${3:echo "no"}\nfi' },
  { label: 'for',      detail: 'For loop',              insertText: 'for ${1:item} in ${2:list}; do\n\t${0:echo "$item"}\ndone' },
  { label: 'while',    detail: 'While loop',            insertText: 'while ${1:condition}; do\n\t${0:echo "loop"}\ndone' },
  { label: 'case',     detail: 'Case statement',        insertText: 'case "${1:\\$var}" in\n\t${2:pattern})\n\t\t${3:echo "matched"}\n\t\t;;\n\t*)\n\t\techo "default"\n\t\t;;\nesac' },
  { label: 'function', detail: 'Function definition',   insertText: '${1:fname}() {\n\t${0:echo "hello"}\n}' },
];

const BASH_COMMANDS = [
  'echo','read','exit','mkdir','ls','grep','awk','sed','curl','wget',
  'cd','pwd','export','source','chmod','cat','touch','rm','cp','mv',
  'find','xargs','sort','uniq','head','tail','wc','tr','cut','date','sleep',
];

function registerBash(monaco: typeof Monaco): Monaco.IDisposable {
  const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;
  return monaco.languages.registerCompletionItemProvider('shell', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
        startColumn: word.startColumn,        endColumn: word.endColumn,
      };
      const snippets: Monaco.languages.CompletionItem[] = BASH_SNIPPETS.map(s => ({
        label: s.label, kind: CompletionItemKind.Snippet, detail: s.detail,
        insertText: s.insertText, insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet, range,
      }));
      const commands: Monaco.languages.CompletionItem[] = BASH_COMMANDS.map(cmd => ({
        label: cmd, kind: CompletionItemKind.Keyword, detail: 'Bash command', insertText: cmd, range,
      }));
      return { suggestions: [...snippets, ...commands] };
    },
  });
}

// ── Docker ──────────────────────────────────────────────────────────────────

const DOCKER_SNIPPETS = [
  { label: 'FROM',        detail: 'Base image',             insertText: 'FROM ${1:ubuntu:22.04}' },
  { label: 'FROM AS',     detail: 'Multi-stage build',      insertText: 'FROM ${1:node:20-slim} AS ${2:builder}' },
  { label: 'RUN',         detail: 'Run command',            insertText: 'RUN ${0:apt-get update && apt-get install -y curl}' },
  { label: 'CMD',         detail: 'Default command',        insertText: 'CMD ["${1:executable}", "${2:arg}"]' },
  { label: 'ENTRYPOINT',  detail: 'Entrypoint',             insertText: 'ENTRYPOINT ["${1:executable}"]' },
  { label: 'ENV',         detail: 'Environment variable',   insertText: 'ENV ${1:KEY}=${2:value}' },
  { label: 'EXPOSE',      detail: 'Expose port',            insertText: 'EXPOSE ${1:8080}' },
  { label: 'COPY',        detail: 'Copy files',             insertText: 'COPY ${1:src} ${2:dest}' },
  { label: 'ADD',         detail: 'Add files',              insertText: 'ADD ${1:src} ${2:dest}' },
  { label: 'WORKDIR',     detail: 'Working directory',      insertText: 'WORKDIR ${1:/app}' },
  { label: 'USER',        detail: 'Set user',               insertText: 'USER ${1:appuser}' },
  { label: 'ARG',         detail: 'Build argument',         insertText: 'ARG ${1:VERSION}=${2:latest}' },
  { label: 'LABEL',       detail: 'Image label',            insertText: 'LABEL ${1:key}="${2:value}"' },
  { label: 'VOLUME',      detail: 'Mount point',            insertText: 'VOLUME ["${1:/data}"]' },
  { label: 'HEALTHCHECK', detail: 'Health check',           insertText: 'HEALTHCHECK --interval=${1:30s} --timeout=${2:10s} CMD ${3:curl -f http://localhost/ || exit 1}' },
  { label: 'SHELL',       detail: 'Override shell',         insertText: 'SHELL ["${1:/bin/bash}", "${2:-c}"]' },
  { label: 'ONBUILD',     detail: 'Trigger on child build', insertText: 'ONBUILD ${0:RUN echo "triggered"}' },
  { label: 'STOPSIGNAL',  detail: 'Stop signal',            insertText: 'STOPSIGNAL ${1:SIGTERM}' },
  {
    label: 'multistage', detail: 'Multi-stage scaffold',
    insertText: '# Build stage\nFROM ${1:node:20-slim} AS builder\nWORKDIR /app\nCOPY . .\nRUN ${2:npm ci && npm run build}\n\n# Runtime stage\nFROM ${3:node:20-slim}\nWORKDIR /app\nCOPY --from=builder /app/${4:dist} .\nCMD ["${0:node}", "index.js"]',
  },
];

function registerDocker(monaco: typeof Monaco): Monaco.IDisposable {
  const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;
  return monaco.languages.registerCompletionItemProvider('dockerfile', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
        startColumn: word.startColumn,        endColumn: word.endColumn,
      };
      return {
        suggestions: DOCKER_SNIPPETS.map(s => ({
          label: s.label, kind: CompletionItemKind.Snippet, detail: s.detail,
          insertText: s.insertText, insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet, range,
        })),
      };
    },
  });
}

// ── Terraform ───────────────────────────────────────────────────────────────

const TERRAFORM_SNIPPETS = [
  { label: 'resource',      detail: 'Resource block',   insertText: 'resource "${1:null_resource}" "${2:example}" {\n\t${0}\n}' },
  { label: 'variable',      detail: 'Input variable',   insertText: 'variable "${1:name}" {\n\ttype        = ${2:string}\n\tdefault     = "${3:value}"\n\tdescription = "${4:Description}"\n}' },
  { label: 'output',        detail: 'Output value',     insertText: 'output "${1:name}" {\n\tvalue       = ${2:null_resource.example.id}\n\tdescription = "${3:Description}"\n}' },
  { label: 'data',          detail: 'Data source',      insertText: 'data "${1:null_data_source}" "${2:example}" {\n\tinputs = {\n\t\t${0}\n\t}\n}' },
  { label: 'locals',        detail: 'Local values',     insertText: 'locals {\n\t${1:key} = ${2:value}\n}' },
  { label: 'module',        detail: 'Module call',      insertText: 'module "${1:name}" {\n\tsource = "${2:./modules/name}"\n\t${0}\n}' },
  { label: 'provider',      detail: 'Provider config',  insertText: 'provider "${1:aws}" {\n\tregion = "${2:us-east-1}"\n}' },
  { label: 'terraform',     detail: 'Terraform block',  insertText: 'terraform {\n\trequired_version = ">= ${1:1.0}"\n\trequired_providers {\n\t\t${2:null} = {\n\t\t\tsource  = "hashicorp/${2:null}"\n\t\t\tversion = ">= ${3:3.0}"\n\t\t}\n\t}\n}' },
  { label: 'null_resource', detail: 'Null resource',    insertText: 'resource "null_resource" "${1:example}" {\n\ttriggers = {\n\t\t${2:value} = "${3:hello}"\n\t}\n}' },
];

function registerTerraform(monaco: typeof Monaco): Monaco.IDisposable {
  const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;
  return monaco.languages.registerCompletionItemProvider('hcl', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
        startColumn: word.startColumn,        endColumn: word.endColumn,
      };
      return {
        suggestions: TERRAFORM_SNIPPETS.map(s => ({
          label: s.label, kind: CompletionItemKind.Snippet, detail: s.detail,
          insertText: s.insertText, insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet, range,
        })),
      };
    },
  });
}

// ── Export ──────────────────────────────────────────────────────────────────

export function registerPlaygroundCompletions(monaco: typeof Monaco): Monaco.IDisposable {
  const disposables = [
    registerPython(monaco),
    registerBash(monaco),
    registerDocker(monaco),
    registerTerraform(monaco),
  ];
  return { dispose: () => disposables.forEach(d => d.dispose()) };
}
