import CodeBlock from '../shared/CodeBlock';
import DocsCallout from '../../shared/docs/DocsCallout';
import { useCloudFormatter } from '../../../hooks/useCloudFormatter';

const INLINE_TOOLS = new Set([
  'docker','kubectl','helm','k9s','aws','gcloud','az','terraform','tofu',
  'git','npm','yarn','pnpm','pip','pip3','apt','apt-get','yum','dnf','brew','apk','cargo',
  'systemctl','journalctl','service','curl','wget','ssh','scp','sftp','rsync',
  'make','cmake','python','python3','node','deno','bun','java','mvn','gradle','ruby','php',
  'ansible','ansible-playbook','ansible-vault','vault','consul','nomad','nginx','apache2',
  'jq','yq','openssl','kubeadm','kind','minikube','k3s','eksctl',
  'istioctl','kustomize','skaffold','flux','argocd',
  'crictl','ctr','nerdctl','podman','buildah','ko','skopeo',
  'trivy','snyk','grype','etcdctl','redis-cli','psql','mysql','mongosh',
  'stern','kubectx','kubens','velero','oc',
  'chmod','chown','tar','find','grep','awk','sed',
  'ping','dig','nslookup','nmap','ss','ip','netstat',
  // binutils / ELF + compiler + debug toolchain
  'readelf','objdump','nm','ldd','ldconfig','ar','ranlib','strip','strings',
  'c++filt','addr2line','objcopy','patchelf','ld','size','file',
  'gcc','g++','clang','clang++','cc','gdb','lldb','valgrind','perf','strace','ltrace','ldd',
  'docker-compose','helmfile','pulumi','packer','vagrant','kustomize','kubeseal',
]);

const renderCmdCode = (text, key) => {
  const toks = text.split(/(\s+)/);
  const cmd = toks[0];
  if (!INLINE_TOOLS.has(cmd)) {
    return (
      <code key={key} className="px-1.5 py-0.5 rounded text-[13px] landing-mono text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border)]">
        {text}
      </code>
    );
  }
  let subcmdDone = false;
  return (
    <code key={key} className="px-1.5 py-0.5 rounded text-[13px] landing-mono bg-[var(--bg-elevated)] border border-[var(--border)]">
      {toks.map((tok, i) => {
        if (/^\s+$/.test(tok)) return tok;
        if (i === 0) return <span key={i} style={{ color: '#61aeee', fontWeight: 600 }}>{tok}</span>;
        if (/^--?\w/.test(tok)) return <span key={i} style={{ color: '#d19a66' }}>{tok}</span>;
        if (!subcmdDone) { subcmdDone = true; return <span key={i} style={{ color: '#98c379' }}>{tok}</span>; }
        return <span key={i} style={{ color: '#abb2bf' }}>{tok}</span>;
      })}
    </code>
  );
};

// Unambiguous DevOps tool names safe to auto-highlight in plain prose.
// Deliberately excludes generic words (grep, find, node, python, ssh) that
// also appear as English nouns/verbs and would cause false positives.
const PROSE_TOOL_RE = /(?<![`\w])(kubectl|terraform|tofu|helm|argocd|fluxcd|istioctl|kustomize|skaffold|kubeadm|eksctl|k9s|minikube|k3s|crictl|podman|buildah|trivy|snyk|grype|etcdctl|kubectx|kubens|velero|consul|nomad|nerdctl|skopeo|ansible-playbook|ansible-vault|docker|ansible|jq|yq)(?![\w`])/;

// Ordinal starters → badge number (or symbol for "Finally" / "Next").
const ORDINAL_NUM = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  finally: '→', next: '→', lastly: '→',
};
const ORDINAL_RE = /^(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Finally|Lastly|Next),\s+(.+)/i;

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

// ── Unfenced-code fencing ─────────────────────────────────────────────────
// LLD / coding answers often store raw source with NO ``` fences, so it used
// to shatter into prose paragraphs (and stray one-brace "code" blocks). Detect
// a code region by a STRONG start signal (class/interface/method declaration —
// never plain prose), extend it by brace depth, and wrap it in a fence so it
// renders in a real CodeBlock. Conservative: pure prose is never touched, and
// content that already has fences is left as-is.
const CODE_START = /^\s*(?:(?:public|private|protected|static|final|abstract|synchronized)\s+)*(?:class|interface|enum|struct|record)\s+\w/;
const CODE_METHOD = /^\s*(?:(?:public|private|protected|static|final|synchronized)\s+)+[\w<>[\],.\s]*\)\s*\{\s*$/;
const CODE_TYPED_METHOD = /^\s*(?:int|void|long|double|float|boolean|char|byte|short|String|var|Node|List|Map|Object|T)\b[\w<>[\],.\s]*\w+\s*\([^;]*\)\s*\{\s*$/;
const CODE_FUNC = /^\s*(?:def|func|function|fn)\s+\w+\s*\(/;
const isCodeStart = (l) => CODE_START.test(l) || CODE_METHOD.test(l) || CODE_TYPED_METHOD.test(l) || CODE_FUNC.test(l);
const CODE_CONT = /[;{}]\s*$|^\s{2,}\S|=>|::|^\s*(?:return|if|else|for|while|switch|case|try|catch|new|throw|break|continue|import|package|@\w+)\b|\b\w+\s*\([^)]*\)\s*[;{]/;
const isCodeish = (l) => isCodeStart(l) || CODE_CONT.test(l);

function fenceUnfencedCode(content) {
  if (typeof content !== 'string' || content.includes('```')) return content;
  const lines = content.split('\n');
  const isBlank = (l) => l.trim() === '';
  const depthOf = (l) => (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (!isBlank(lines[i]) && isCodeStart(lines[i])) {
      const region = [];
      let depth = 0, j = i;
      while (j < lines.length) {
        region.push(lines[j]);
        depth += depthOf(lines[j]);
        if (depth <= 0) {
          let k = j + 1;
          while (k < lines.length && isBlank(lines[k])) k++;
          if (k < lines.length && isCodeish(lines[k]) && (k - j) <= 2) {
            for (let m = j + 1; m < k; m++) region.push(lines[m]);
            j = k - 1;
          } else break;
        }
        j++;
      }
      out.push('```java', ...region, '```');
      i = j + 1;
    } else { out.push(lines[i]); i++; }
  }
  return out.join('\n');
}

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

  // Detect whether a "diagram" block is actually a markdown pipe-table.
  // Box-drawing art (┌─┐ │ └─┘) is excluded so genuine ASCII diagrams
  // still render as <pre>. A valid table needs header + separator + 1+ rows.
  const isMarkdownTable = (lines) => {
    const nonEmpty = lines.filter(l => l.trim());
    if (nonEmpty.length < 2) return false;
    if (/[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬]/.test(nonEmpty.join(''))) return false;
    const pipeRow = /^\s*\|.+\|\s*$/;
    const sepRow  = /^\s*\|[\s|:?-]+\|\s*$/;
    return pipeRow.test(nonEmpty[0]) && nonEmpty.some(l => sepRow.test(l));
  };

  const parseMarkdownTable = (lines) => {
    const nonEmpty = lines.filter(l => l.trim());
    const sepRow  = /^\s*\|[\s|:?-]+\|\s*$/;
    const sepIdx  = nonEmpty.findIndex(l => sepRow.test(l));
    const cells   = (line) => line.split('|').slice(1, -1).map(c => c.trim());
    const headers = sepIdx === 1 ? cells(nonEmpty[0]) : [];
    const body    = nonEmpty.filter((_, i) => i !== sepIdx && (sepIdx === 1 ? i > 0 : true));
    return { headers, rows: body.map(cells) };
  };

  const isStarKey = (s) => /^(Situation|Task|Action|Result)$/i.test(s);

  const renderStarEyebrow = (keyword, key) => (
    <span
      key={key}
      className="inline-block mr-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] landing-mono"
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

    // Auto-style a leading CLI command in a "cmd - description" bullet so
    // command-reference lists render bold+colored even when the data has no
    // backticks. Allowlist-gated (INLINE_TOOLS) so ordinary "Word - desc"
    // prose and non-command keys (semver, p50, entrypoint…) are untouched.
    if (!starMatch) {
      const lead = remaining.match(/^([a-z][a-z0-9.+_-]*(?:\s+(?:and|vs\.?|or)\s+[a-z][a-z0-9.+_-]*)*)\s+[-–—]\s+/);
      if (lead) {
        const seg = lead[1];
        const cmds = seg.split(/\s+(?:and|vs\.?|or)\s+/);
        if (cmds.length && cmds.every((c) => INLINE_TOOLS.has(c))) {
          seg.split(/(\s+(?:and|vs\.?|or)\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+(?:and|vs\.?|or)\s+$/.test(p)) parts.push(p);
            else parts.push(renderCmdCode(p, keyCounter++));
          });
          remaining = remaining.substring(seg.length); // leaves " - description"
        }
      }
    }

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      const codeMatch = remaining.match(/`([^`]+)`/);
      const quoteMatch = remaining.match(/"([^"]{10,})"/);
      const toolMatch = remaining.match(PROSE_TOOL_RE);

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
        matchIndex = quoteMatch.index;
      }
      if (toolMatch && toolMatch.index < matchIndex) {
        nextMatch = toolMatch;
        matchType = 'tool';
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
          parts.push(renderCmdCode(nextMatch[1], keyCounter++));
        } else if (matchType === 'quote') {
          parts.push(
            <em key={keyCounter++} className="text-[var(--text-primary)] italic">
              {nextMatch[1]}
            </em>,
          );
        } else if (matchType === 'tool') {
          parts.push(renderCmdCode(nextMatch[0], keyCounter++));
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
  // Fence any unfenced code (LLD/coding answers store raw source) before parsing.
  const lines = fenceUnfencedCode(content).split('\n');
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
      if (isMarkdownTable(block.lines)) {
        const { headers, rows } = parseMarkdownTable(block.lines);
        pushBody(
          <div
            key={`table-${blockIdx}`}
            className="my-3 rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            <table className="w-full border-collapse">
              {headers.length > 0 && (
                <thead>
                  <tr>
                    {headers.map((h, ci) => (
                      <th
                        key={ci}
                        className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-[0.12em] landing-mono whitespace-nowrap"
                        style={{
                          background: 'var(--bg-elevated)',
                          color: 'var(--cam-gold-leaf, var(--accent))',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-3 py-2.5 text-[13px] landing-body"
                        style={{
                          background: ri % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                          color: ci === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontWeight: ci === 0 ? 600 : 400,
                          borderBottom: ri < rows.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        {formatInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      } else {
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
      }
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
          <ul key={`list-${blockIdx}-${listKeyCounter++}`} className="grid grid-cols-1 gap-2 my-3 ml-6">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-[0.45em] flex-shrink-0" />
                <span className="text-[var(--text-secondary)] text-[15px] leading-[1.7] landing-body">
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
                    className="inline-flex items-center justify-center min-w-[26px] h-[22px] px-1.5 text-[12px] font-bold landing-mono tabular-nums flex-shrink-0 mt-0.5"
                    style={{
                      background: 'color-mix(in oklab, var(--accent) 12%, transparent)',
                      color: 'var(--accent)',
                      border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
                      borderRadius: '6px',
                    }}
                  >
                    {String(item.n).padStart(2, '0')}
                  </span>
                  <span className={`text-[15px] leading-[1.7] landing-body ${isHeader ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
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
                    background: 'color-mix(in oklab, var(--cam-primary, var(--accent)) 8%, transparent)',
                    color: 'var(--cam-primary, var(--accent))',
                    border: '1px solid color-mix(in oklab, var(--cam-primary, var(--accent)) 18%, transparent)',
                    maxWidth: '260px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  data-tip={row.cmd}
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
                className="p-3 rounded-md"
                style={{
                  border: '1px solid color-mix(in oklab, var(--accent) 20%, var(--border))',
                  background: 'color-mix(in oklab, var(--accent) 5%, transparent)',
                }}
              >
                <dt className="font-semibold text-[var(--text-primary)] text-[15px] leading-tight landing-display mb-1">
                  {entry.term}
                </dt>
                <dd className="text-[var(--text-secondary)] text-[15px] leading-[1.65] landing-body m-0">
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
        const wordM = s.match(/^([a-zA-Z][\w.-]{0,28})\s+—\s+(.+)$/);
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
                className="mt-6 mb-2 first:mt-0 text-[12px] uppercase tracking-[0.16em] font-bold text-[var(--text-muted)] landing-mono"
              >
                {keyword}
              </div>,
            );
          } else {
            openSection(
              <h3
                key={`h-${blockIdx}-${lineIdx}`}
                className="landing-display prep-section-heading"
              >
                {formatInlineText(headerText)}
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
              className="mt-4 mb-1 first:mt-0 text-[12px] uppercase tracking-[0.16em] font-bold text-[var(--text-muted)] landing-mono"
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
                  className="text-[12px] font-bold landing-mono px-2 py-0.5 rounded"
                  style={{
                    background: 'color-mix(in oklab, var(--cam-primary, var(--accent)) 8%, transparent)',
                    color: 'var(--cam-primary, var(--accent))',
                    border: '1px solid color-mix(in oklab, var(--cam-primary, var(--accent)) 18%, transparent)',
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
                className="landing-display prep-section-heading"
              >
                {formatInlineText(label)}
              </h4>,
            );
          }
          return;
        }

        // Markdown headings: # / ## / ### — mapped to h2/h3/h4 for book hierarchy
        const h2Match = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (h2Match) {
          flushAll();
          const level = h2Match[1].length;
          const text = h2Match[2];
          if (level === 1) {
            openSection(
              <h2
                key={`h-${blockIdx}-${lineIdx}`}
                className="landing-display prep-section-heading"
              >
                {formatInlineText(text)}
              </h2>,
            );
          } else if (level === 2) {
            openSection(
              <h3
                key={`h-${blockIdx}-${lineIdx}`}
                className="landing-display prep-section-heading"
              >
                {formatInlineText(text)}
              </h3>,
            );
          } else {
            openSection(
              <h4
                key={`h-${blockIdx}-${lineIdx}`}
                className="landing-display prep-section-heading"
              >
                {formatInlineText(text)}
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

        // Ordinal numbered point: "First, label. Body..." renders as a
        // numbered badge + bold label + body, breaking up "wall of paragraphs".
        const ordinalM = trimmed.match(ORDINAL_RE);
        if (ordinalM) {
          const num = ORDINAL_NUM[ordinalM[1].toLowerCase()];
          const rest = ordinalM[2];
          const dotIdx = rest.indexOf('. ');
          let label = null, body = rest;
          if (dotIdx > 0 && dotIdx < 70) {
            label = rest.substring(0, dotIdx);
            body = rest.substring(dotIdx + 2);
          }
          flushAll();
          pushBody(
            <div key={`ord-${blockIdx}-${lineIdx}`} className="flex gap-3 my-3.5 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[12px] font-bold text-[var(--accent-text)] flex items-center justify-center mt-[3px] landing-mono select-none">
                {num}
              </span>
              <span className="flex-1 text-[15px] leading-[1.75] landing-body text-[var(--text-secondary)]">
                {label && <strong className="text-[var(--text-primary)] font-semibold">{label}. </strong>}
                {formatInlineText(body)}
              </span>
            </div>,
          );
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
            className="text-[var(--text-secondary)] text-[15px] leading-[1.75] my-3.5 landing-body"
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
            <div className="pl-6 ml-2 pt-1 border-l border-[var(--border)]">
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
