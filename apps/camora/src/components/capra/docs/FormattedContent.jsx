import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import DocsCallout from '../../shared/docs/DocsCallout';
import { useCloudFormatter } from '../../../hooks/useCloudFormatter';

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

const CodeBlock = ({ code, lang, blockKey }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const prismLang = LANG_MAP[(lang || '').toLowerCase()] || 'text';
  return (
    <div key={blockKey} className="prep-code-block">
      <div className="prep-code-header">
        <span className="prep-code-lang">{lang || 'code'}</span>
        <button className="prep-code-copy" onClick={handleCopy}>
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <SyntaxHighlighter language={prismLang} style={codeTheme} wrapLongLines={false}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

// Common English sentence starters excluded from the "Term. Definition" detector.
// Technical terms (Pod, Deployment, ConfigMap, etc.) are intentionally absent.
const TERM_DEF_STARTERS_EXCLUDED = new Set([
  'The', 'A', 'An', 'This', 'These', 'Those', 'It', 'They', 'We', 'I', 'You', 'He', 'She',
  'In', 'On', 'At', 'For', 'If', 'When', 'Since', 'Also', 'Both', 'Each', 'Every',
  'All', 'Some', 'Most', 'Many', 'Any', 'No', 'Not', 'Now', 'Then', 'After', 'Before',
  'While', 'Because', 'Although', 'However', 'Therefore', 'Thus', 'Hence',
  'First', 'Second', 'Third', 'Finally', 'Next', 'Last', 'To', 'By', 'Here', 'There',
  'See', 'As', 'With', 'Without', 'From', 'Into', 'Over', 'Under', 'Between', 'Among',
  'Through', 'Note', 'Unlike', 'Like', 'Where', 'How', 'Why', 'What', 'Which', 'Who',
]);

export default function FormattedContent({ content, inline = false }) {
  // Translate AWS service names to Azure/GCP equivalents for the chosen
  // cloud BEFORE parsing into blocks. The formatter skips fenced code so
  // SDK calls (`s3.putObject(...)`) stay intact; only prose ("use S3 for
  // blob storage") gets translated. AWS users see content unchanged.
  const formatCloud = useCloudFormatter();
  const translated = formatCloud(content);
  if (!translated) return null;
  // Bind the translated text into the existing parser without renaming
  // the variable — keeps the rest of the function unchanged.

  // Strip line-start emoji markers that leak literally into the DOM.
  // ❌/✅ pairs convey "avoid this / do this" semantics in behavioral
  // answers — preserve the contrast as a text prefix so the bold
  // sub-heading still reads correctly. Plain check/bullet glyphs
  // (✓ ● ○ ...) are list markers and just get stripped.
  content = translated
    .replace(/^[ \t]*❌\s+/gm, 'Avoid — ')
    .replace(/^[ \t]*✅\s+/gm, 'Do — ')
    .replace(/^[ \t]*[✓●○◉◈◆◇▪▫■□]\s+/gm, '');

  const isDiagramLine = (line) => {
    if (/[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬▶▼◀▲→←↑↓►◄]/.test(line)) return true;
    if (/[|]{2,}|[-]{3,}|[─]{2,}|[=]{3,}/.test(line)) return true;
    if (/^\s*[|│┃├└┌╔╚╠]/.test(line)) return true;
    if (/──+[>▶►]|[<◀◄]──+|->|<-/.test(line)) return true;
    if (line.length > 10 && /^\s{4,}[│|├└┌]/.test(line)) return true;
    return false;
  };

  const isStarKey = (s) => /^(Situation|Task|Action|Result)$/i.test(s);

  const renderStarEyebrow = (keyword, key) => (
    <span
      key={key}
      className="inline-block mr-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] landing-mono"
    >
      {keyword}
    </span>
  );

  const formatInlineText = (text) => {
    const parts = [];
    let remaining = text;
    let keyCounter = 0;

    const starMatch = remaining.match(/^(Situation|Task|Action|Result)\s*[:–—-]\s*/i);
    if (starMatch) {
      const keyword =
        starMatch[1].charAt(0).toUpperCase() + starMatch[1].slice(1).toLowerCase();
      parts.push(renderStarEyebrow(keyword, keyCounter++));
      remaining = remaining.substring(starMatch[0].length);
    }

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      const codeMatch = remaining.match(/`([^`]+)`/);
      const quoteMatch = remaining.match(/"([^"]{10,})"/);

      let nextMatch = null;
      let matchType = null;
      let matchIndex = Infinity;

      if (boldMatch && boldMatch.index < matchIndex) {
        nextMatch = boldMatch;
        matchType = 'bold';
        matchIndex = boldMatch.index;
      }
      if (codeMatch && codeMatch.index < matchIndex) {
        nextMatch = codeMatch;
        matchType = 'code';
        matchIndex = codeMatch.index;
      }
      if (quoteMatch && quoteMatch.index < matchIndex) {
        nextMatch = quoteMatch;
        matchType = 'quote';
      }

      if (nextMatch) {
        if (nextMatch.index > 0) {
          parts.push(remaining.substring(0, nextMatch.index));
        }
        if (matchType === 'bold') {
          parts.push(
            <strong
              key={keyCounter++}
              className="text-[var(--text-primary)] font-semibold"
            >
              {nextMatch[1]}
            </strong>,
          );
        } else if (matchType === 'code') {
          parts.push(
            <code
              key={keyCounter++}
              className="px-1.5 py-0.5 rounded text-[13px] landing-mono text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border)]"
            >
              {nextMatch[1]}
            </code>,
          );
        } else if (matchType === 'quote') {
          parts.push(
            <em key={keyCounter++} className="text-[var(--text-primary)] italic">
              {nextMatch[1]}
            </em>,
          );
        }
        remaining = remaining.substring(nextMatch.index + nextMatch[0].length);
      } else {
        parts.push(remaining);
        break;
      }
    }

    return parts.length > 0 ? parts : text;
  };

  // Inline-only mode: skip block parsing entirely. Use this for short
  // list-item strings (tips, steps, mistakes, principles) that would
  // otherwise leak `**bold**` / `` `code` `` literals when rendered raw.
  if (inline) {
    const out = formatInlineText(content);
    return <>{Array.isArray(out) ? out : out}</>;
  }

  const blocks = [];
  let currentBlock = { type: 'text', lines: [], lang: null };
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBlockLang = null;

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        if (currentBlock.lines.length > 0) blocks.push(currentBlock);
        codeBlockLang = line.trim().slice(3).trim() || 'code';
        currentBlock = { type: 'code', lines: [], lang: codeBlockLang };
        inCodeBlock = true;
      } else {
        blocks.push(currentBlock);
        currentBlock = { type: 'text', lines: [], lang: null };
        inCodeBlock = false;
        codeBlockLang = null;
      }
      return;
    }

    if (inCodeBlock) {
      currentBlock.lines.push(line);
      return;
    }

    const isDiagram = isDiagramLine(line);

    if (isDiagram) {
      if (currentBlock.type !== 'diagram') {
        if (currentBlock.lines.length > 0) blocks.push(currentBlock);
        currentBlock = { type: 'diagram', lines: [], lang: null };
      }
      currentBlock.lines.push(line);
    } else {
      if (currentBlock.type !== 'text') {
        if (currentBlock.lines.length > 0) blocks.push(currentBlock);
        currentBlock = { type: 'text', lines: [], lang: null };
      }
      currentBlock.lines.push(line);
    }
  });

  if (currentBlock.lines.length > 0) blocks.push(currentBlock);

  // PPT-style hierarchy: each header opens a new "section" whose body is
  // indented under a gold-leaf left rail until the next header. Without
  // this grouping, bullets and paragraphs sat at the same column as the
  // section title — no parent → child cue.
  const sections = [{ header: null, body: [] }];
  let currentSection = sections[0];
  const openSection = (headerEl) => {
    currentSection = { header: headerEl, body: [] };
    sections.push(currentSection);
  };
  const pushBody = (el) => {
    currentSection.body.push(el);
  };

  blocks.forEach((block, blockIdx) => {
    if (block.type === 'code') {
      pushBody(
        <CodeBlock key={`code-${blockIdx}`} code={block.lines.join('\n')} lang={block.lang || 'code'} />,
      );
    } else if (block.type === 'diagram') {
      pushBody(
        <div
          key={`diagram-${blockIdx}`}
          className="my-2 rounded border border-[var(--border)] overflow-x-auto bg-[var(--bg-elevated)]"
        >
          <pre
            className="p-4 text-sm leading-7 landing-mono text-[var(--text-secondary)]"
            style={{ whiteSpace: 'pre', tabSize: 4, margin: 0, overflow: 'visible' }}
          >
            {block.lines.join('\n')}
          </pre>
        </div>,
      );
    } else {
      let currentList = [];
      let currentNumberedList = [];
      let currentCliGroup = [];
      let currentStructuredGroup = [];
      let currentShellGroup = [];
      let currentTermDefGroup = [];
      let listKeyCounter = 0;

      const flushStructuredGroup = () => {
        if (currentStructuredGroup.length === 0) return;
        const rows = currentStructuredGroup.slice();
        const lang = rows.some(l => l.trimStart().startsWith('"') || l.includes('": ')) ? 'json' : 'yaml';
        currentSection.body.push(
          <CodeBlock key={`struct-${blockIdx}-${listKeyCounter++}`} code={rows.join('\n')} lang={lang} />,
        );
        currentStructuredGroup = [];
      };

      const flushShellGroup = () => {
        if (currentShellGroup.length === 0) return;
        const rows = currentShellGroup.slice();
        currentSection.body.push(
          <CodeBlock key={`shell-${blockIdx}-${listKeyCounter++}`} code={rows.join('\n')} lang="bash" />,
        );
        currentShellGroup = [];
      };

      // Detect JSON/YAML structured-data lines that weren't wrapped in fenced blocks.
      // isJsonLine starts a new group; isYamlContinueLine only extends an open group.
      const isJsonLine = (s) => {
        if (/^[{}[\]],?$/.test(s)) return true;
        if (/^"[\w$@./-]+":\s/.test(s)) return true;
        if (/^\{.*"/.test(s) && /[}\]],?$/.test(s)) return true;
        if (/^[a-zA-Z][a-zA-Z0-9_-]*:\s+.+,$/.test(s)) return true;
        return false;
      };
      const isYamlContinueLine = (s) => {
        if (/^[a-z][a-zA-Z0-9_-]*:\s+\S/.test(s) && !/[.!?]$/.test(s)) return true;
        if (/^\s{2,}[a-z][a-zA-Z0-9_-]*[\s:]/.test(s)) return true;
        if (/^\s*-\s+[a-z_A-Z]/.test(s)) return true;
        return false;
      };

      const flushList = () => {
        if (currentList.length === 0) return;
        const items = currentList;
        currentSection.body.push(
          <ul key={`list-${blockIdx}-${listKeyCounter++}`} className="grid grid-cols-1 gap-1.5 my-2 ml-8">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0" />
                <span className="text-[var(--text-secondary)] text-sm leading-relaxed landing-body">
                  {formatInlineText(item)}
                </span>
              </li>
            ))}
          </ul>,
        );
        currentList = [];
      };

      const flushNumberedList = () => {
        if (currentNumberedList.length === 0) return;
        const items = currentNumberedList;
        currentSection.body.push(
          <ol key={`ol-${blockIdx}-${listKeyCounter++}`} className="grid grid-cols-1 gap-2 my-3">
            {items.map((item, i) => {
              const isHeader = item.text.endsWith(':');
              const text = isHeader ? item.text.slice(0, -1) : item.text;
              return (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="inline-flex items-center justify-center min-w-[26px] h-[22px] px-1.5 text-[11px] font-bold landing-mono tabular-nums flex-shrink-0 mt-0.5"
                    style={{
                      background: 'color-mix(in oklab, var(--accent) 12%, transparent)',
                      color: 'var(--accent)',
                      border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
                      borderRadius: '6px',
                    }}
                  >
                    {String(item.n).padStart(2, '0')}
                  </span>
                  <span className={`text-sm leading-relaxed landing-body ${isHeader ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                    {formatInlineText(text)}
                  </span>
                </li>
              );
            })}
          </ol>,
        );
        currentNumberedList = [];
      };

      // Flush accumulated CLI reference rows as a styled two-column card.
      // Flag / command in a monospace code pill; description as body prose.
      // Consecutive CLI-detected lines are grouped into one card; prose
      // lines between them break the group.
      const flushCliGroup = () => {
        if (currentCliGroup.length === 0) return;
        const rows = currentCliGroup.slice();
        currentSection.body.push(
          <div
            key={`cli-${blockIdx}-${listKeyCounter++}`}
            className="my-3 rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            {rows.map((row, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-2.5"
                style={{
                  borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                  background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                }}
              >
                <code
                  className="flex-shrink-0 text-[12px] font-bold landing-mono px-2 py-0.5 rounded self-start mt-0.5 whitespace-nowrap"
                  style={{
                    background: 'color-mix(in oklab, var(--cam-primary, #26619C) 8%, transparent)',
                    color: 'var(--cam-primary, #26619C)',
                    border: '1px solid color-mix(in oklab, var(--cam-primary, #26619C) 18%, transparent)',
                    maxWidth: '260px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={row.cmd}
                >
                  {row.cmd}
                </code>
                <span className="text-[14px] text-[var(--text-secondary)] leading-relaxed landing-body pt-0.5 min-w-0">
                  {formatInlineText(row.desc)}
                </span>
              </div>
            ))}
          </div>,
        );
        currentCliGroup = [];
      };

      // Flush accumulated "Term. Definition" entries as a styled definition list.
      // Groups of consecutive entries share one <dl>; lone entries still get the visual treatment.
      const flushTermDefGroup = () => {
        if (currentTermDefGroup.length === 0) return;
        const entries = currentTermDefGroup.slice();
        currentSection.body.push(
          <dl key={`td-${blockIdx}-${listKeyCounter++}`} className="my-4 space-y-3">
            {entries.map((entry, i) => (
              <div
                key={i}
                className="pl-4"
                style={{ borderLeft: '2px solid color-mix(in oklab, var(--accent) 40%, transparent)' }}
              >
                <dt className="font-semibold text-[var(--text-primary)] text-[15px] leading-tight landing-display mb-1">
                  {entry.term}
                </dt>
                <dd className="text-[var(--text-secondary)] text-[14px] leading-[1.65] landing-body m-0">
                  {formatInlineText(entry.definition)}
                </dd>
              </div>
            ))}
          </dl>,
        );
        currentTermDefGroup = [];
      };

      const flushAll = () => { flushList(); flushNumberedList(); flushCliGroup(); flushStructuredGroup(); flushShellGroup(); flushTermDefGroup(); };

      // Detect CLI reference line patterns. Returns { cmd, desc } or null.
      // A: Flag rows  — "-d   detach" / "--name <n>   assign a name..."
      //    Starts with - or --, then optional arg, then 2+ spaces, then desc.
      // B: Column-aligned em-dash — "docker inspect <n>     — full JSON..."
      //    Any text + 2+ spaces + em dash + desc. 2+ spaces = column-pad signal.
      // C: Short lowercase phrase em-dash — "stop — sends SIGTERM"
      //    Only a lowercase word/phrase (≤28 chars) before single-space " — ".
      //    Avoids false-positives from prose like "Performance — key factor."
      const detectCliRow = (s) => {
        const flagM = s.match(/^(-{1,2}[\w][\w.-]*)(\s+\S+)?\s{2,}(\S.+)$/);
        if (flagM) return { cmd: (flagM[1] + (flagM[2] || '')).trim(), desc: flagM[3] };
        const hashM = s.match(/^([^#\n]+?)\s{2,}#\s+(.+)$/);
        if (hashM) return { cmd: hashM[1].trim(), desc: hashM[2] };
        const col2M = s.match(/^(.+?)\s{2,}—\s+(.+)$/);
        if (col2M) return { cmd: col2M[1].trim(), desc: col2M[2] };
        const wordM = s.match(/^([a-z][\w.-]{0,28})\s+—\s+(.+)$/);
        if (wordM) return { cmd: wordM[1], desc: wordM[2] };
        return null;
      };

      block.lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          flushAll();
          return;
        }

        // Databricks/GitHub-style callouts: `> [!NOTE] body`, etc.
        const calloutMatch = trimmed.match(/^>\s*\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*(.*)$/i);
        if (calloutMatch) {
          flushAll();
          const tag = calloutMatch[1].toUpperCase();
          const body = calloutMatch[2];
          const variant =
            tag === 'TIP' ? 'tip' :
            tag === 'WARNING' ? 'warning' :
            tag === 'CAUTION' || tag === 'IMPORTANT' ? 'caution' :
            'note';
          pushBody(
            <div key={`cb-${blockIdx}-${lineIdx}`} className="my-3">
              <DocsCallout variant={variant}>{formatInlineText(body)}</DocsCallout>
            </div>,
          );
          return;
        }

        // Section heading: standalone `**Header**` line only — not bold lead-in.
        const standaloneBoldHeader =
          trimmed.match(/^\*\*([^*]+?)\*\*\s*:?\s*$/) ||
          trimmed.match(/^\*\*([^*]+?):\*\*\s*$/);
        if (standaloneBoldHeader) {
          flushAll();
          const headerText = standaloneBoldHeader[1].replace(/:\s*$/, '');
          if (isStarKey(headerText)) {
            const keyword =
              headerText.charAt(0).toUpperCase() + headerText.slice(1).toLowerCase();
            pushBody(
              <div
                key={`star-${blockIdx}-${lineIdx}`}
                className="mt-6 mb-2 first:mt-0 text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--text-muted)] landing-mono"
              >
                {keyword}
              </div>,
            );
          } else {
            openSection(
              <h3
                key={`h-${blockIdx}-${lineIdx}`}
                className="text-[var(--accent)] font-bold text-[18px] mt-8 mb-2 first:mt-0 landing-display tracking-tight leading-tight"
              >
                {headerText}
              </h3>,
            );
          }
          return;
        }

        const starHeaderMatch = trimmed.match(/^(Situation|Task|Action|Result)\s*[:]\s*$/i);
        if (starHeaderMatch) {
          flushAll();
          const keyword =
            starHeaderMatch[1].charAt(0).toUpperCase() + starHeaderMatch[1].slice(1).toLowerCase();
          pushBody(
            <div
              key={`star-${blockIdx}-${lineIdx}`}
              className="mt-4 mb-1 first:mt-0 text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--text-muted)] landing-mono"
            >
              {keyword}
            </div>,
          );
          return;
        }

        // Sub-section header: short line ending with `:` containing no `.`.
        // CLI headers (lowercase, contains spaces) get a monospace eyebrow
        // pill instead of a prose h4 to signal "reference section".
        if (trimmed.endsWith(':') && trimmed.length < 60 && !trimmed.includes('.')) {
          flushAll();
          const label = trimmed.replace(/:\s*$/, '');
          const isCliHeader = /\s/.test(label) && /^[a-z]/.test(label);
          if (isCliHeader) {
            openSection(
              <div
                key={`h-${blockIdx}-${lineIdx}`}
                className="flex items-center gap-2 mt-6 mb-2 first:mt-0"
              >
                <span
                  className="text-[11px] font-bold landing-mono px-2 py-0.5 rounded"
                  style={{
                    background: 'color-mix(in oklab, var(--cam-primary, #26619C) 8%, transparent)',
                    color: 'var(--cam-primary, #26619C)',
                    border: '1px solid color-mix(in oklab, var(--cam-primary, #26619C) 18%, transparent)',
                  }}
                >
                  {label}
                </span>
              </div>,
            );
          } else {
            openSection(
              <h4
                key={`h-${blockIdx}-${lineIdx}`}
                className="text-[var(--text-primary)] font-semibold text-[15px] mt-6 mb-1.5 first:mt-0 landing-display tracking-tight"
              >
                {label}
              </h4>,
            );
          }
          return;
        }

        // Markdown headings: ## Heading / ### Heading
        const h2Match = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (h2Match) {
          flushAll();
          const level = h2Match[1].length;
          const text = h2Match[2];
          if (level === 1) {
            openSection(
              <h3
                key={`h-${blockIdx}-${lineIdx}`}
                className="text-[var(--accent)] font-bold text-[18px] mt-8 mb-2 first:mt-0 landing-display tracking-tight leading-tight"
              >
                {text}
              </h3>,
            );
          } else {
            openSection(
              <h4
                key={`h-${blockIdx}-${lineIdx}`}
                className="text-[var(--text-primary)] font-semibold text-[15px] mt-6 mb-1.5 first:mt-0 landing-display tracking-tight"
              >
                {text}
              </h4>,
            );
          }
          return;
        }

        // Numbered list: "1. Item text"
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numberedMatch) {
          flushList(); flushCliGroup();
          currentNumberedList.push({ n: parseInt(numberedMatch[1], 10), text: numberedMatch[2] });
          return;
        }

        // Pure bash comment line: "# Or: ..."
        if (trimmed.startsWith('# ')) {
          flushList(); flushNumberedList();
          currentCliGroup.push({ cmd: trimmed, desc: '' });
          return;
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          flushCliGroup(); flushNumberedList();
          currentList.push(trimmed.substring(2));
          return;
        }

        // Q&A pairs: "Q: " / "A: " get navy/gold badge treatment.
        const qaMatch = trimmed.match(/^([QA]):\s+(.+)$/);
        if (qaMatch) {
          flushAll();
          const label = qaMatch[1];
          const body = qaMatch[2];
          pushBody(
            <div key={`qa-${blockIdx}-${lineIdx}`} className={label === 'Q' ? 'qa-q' : 'qa-a'}>
              <span className="qa-label">{label}</span>
              <span className="qa-body">{formatInlineText(body)}</span>
            </div>,
          );
          return;
        }

        // Shell commands: lines starting with "$ " accumulate as a bash code block.
        if (trimmed.startsWith('$ ')) {
          flushList(); flushNumberedList(); flushCliGroup(); flushStructuredGroup();
          currentShellGroup.push(trimmed);
          return;
        }

        // JSON/YAML structured data lines that weren't in fenced code blocks.
        // isJsonLine() starts a new group; isYamlContinueLine() only extends one.
        if (isJsonLine(trimmed)) {
          flushList(); flushNumberedList(); flushCliGroup(); flushShellGroup();
          currentStructuredGroup.push(trimmed);
          return;
        }
        if (isYamlContinueLine(trimmed) && currentStructuredGroup.length > 0) {
          currentStructuredGroup.push(trimmed);
          return;
        }

        // CLI reference rows: detected flag rows and em-dash command rows
        // accumulate into a visual two-column card (flushed on next non-CLI line).
        const cliRow = detectCliRow(trimmed);
        if (cliRow) {
          flushList(); flushStructuredGroup(); flushShellGroup();
          currentCliGroup.push(cliRow);
          return;
        }

        // "Term. Definition sentence." pattern — catches K8s/DevOps glossary-style entries like
        // "Pod. The smallest schedulable unit..." where the term has no bold/colon marker.
        // Conditions: term ≤ 50 chars, starts uppercase, ≤ 5 words, no comma, not a
        // common English sentence starter, definition ≥ 20 chars.
        const termPeriodIdx = trimmed.indexOf('. ');
        if (termPeriodIdx > 1 && termPeriodIdx < 50) {
          const possibleTerm = trimmed.substring(0, termPeriodIdx);
          const termDefinition = trimmed.substring(termPeriodIdx + 2);
          const termFirstWord = possibleTerm.split(/[\s(]/)[0];
          const termWordCount = possibleTerm.trim().split(/\s+/).length;
          if (
            termDefinition.length >= 20 &&
            /^[A-Z]/.test(possibleTerm) &&
            termWordCount <= 5 &&
            !possibleTerm.includes(',') &&
            !TERM_DEF_STARTERS_EXCLUDED.has(termFirstWord)
          ) {
            flushList(); flushNumberedList(); flushCliGroup(); flushStructuredGroup(); flushShellGroup();
            currentTermDefGroup.push({ term: possibleTerm, definition: termDefinition });
            return;
          }
        }

        // Plain prose paragraph — flush any pending groups first.
        flushAll();
        pushBody(
          <p
            key={`p-${blockIdx}-${lineIdx}`}
            className="text-[var(--text-secondary)] text-[15px] leading-[1.6] my-3 landing-body"
          >
            {formatInlineText(trimmed)}
          </p>,
        );
      });

      flushAll();
    }
  });

  // Render the section tree: header flush left, body indented under a
  // gold-leaf rail (PPT parent → child grammar). A leading section with
  // no header skips the rail so intro paragraphs aren't pushed in.
  const elements = sections.map((sec, i) => (
    <div key={`sec-${i}`}>
      {sec.header}
      {sec.body.length > 0 && (
        sec.header
          ? (
            <div className="pl-4 ml-1" style={{ borderLeft: '2px solid var(--cam-gold-leaf)' }}>
              {sec.body}
            </div>
          )
          : sec.body
      )}
    </div>
  ));

  // `prep-content` opts this surface into the docs design system (navy
  // strip headings, gold-leaf code, glassy chrome) without inheriting
  // the docs-only table + topic-card styles. See globals.css.
  return <div className="formatted-content prep-content">{elements}</div>;
}
