export default function FormattedContent({ content }) {
  if (!content) return null;

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
        matchIndex = quoteMatch.index;
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

  const elements = [];

  blocks.forEach((block, blockIdx) => {
    if (block.type === 'code') {
      elements.push(
        <div
          key={`code-${blockIdx}`}
          className="my-2 rounded border border-[var(--border)] overflow-hidden bg-[var(--bg-elevated)]"
        >
          {block.lang && block.lang !== 'code' && (
            <div className="px-4 py-1.5 text-[10px] uppercase tracking-[0.14em] landing-mono text-[var(--text-muted)] border-b border-[var(--border)]">
              {block.lang}
            </div>
          )}
          <pre
            className="p-4 text-sm leading-7 overflow-x-auto landing-mono text-[var(--text-primary)]"
            style={{ whiteSpace: 'pre', tabSize: 2, margin: 0 }}
          >
            {block.lines.join('\n')}
          </pre>
        </div>,
      );
    } else if (block.type === 'diagram') {
      elements.push(
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

      const flushList = () => {
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${elements.length}`} className="grid grid-cols-1 gap-1.5 my-2 ml-1">
              {currentList.map((item, i) => (
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
        }
      };

      block.lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          flushList();
          return;
        }

        if (
          trimmed.match(/^\*\*[^*]+\*\*[:\s(]/) ||
          (trimmed.startsWith('**') && trimmed.endsWith(':'))
        ) {
          flushList();
          const headerText = trimmed.replace(/\*\*/g, '').replace(/:\s*$/, '');
          if (isStarKey(headerText)) {
            const keyword =
              headerText.charAt(0).toUpperCase() + headerText.slice(1).toLowerCase();
            elements.push(
              <div
                key={`star-${blockIdx}-${lineIdx}`}
                className="mt-4 mb-1 first:mt-0 text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--text-muted)] landing-mono"
              >
                {keyword}
              </div>,
            );
          } else {
            elements.push(
              <div
                key={`h-${blockIdx}-${lineIdx}`}
                className="text-[var(--text-primary)] font-semibold text-sm mt-4 mb-1 first:mt-0 landing-display"
              >
                {headerText}
              </div>,
            );
          }
          return;
        }

        const starHeaderMatch = trimmed.match(/^(Situation|Task|Action|Result)\s*[:]\s*$/i);
        if (starHeaderMatch) {
          flushList();
          const keyword =
            starHeaderMatch[1].charAt(0).toUpperCase() + starHeaderMatch[1].slice(1).toLowerCase();
          elements.push(
            <div
              key={`star-${blockIdx}-${lineIdx}`}
              className="mt-4 mb-1 first:mt-0 text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--text-muted)] landing-mono"
            >
              {keyword}
            </div>,
          );
          return;
        }

        if (trimmed.endsWith(':') && trimmed.length < 50 && !trimmed.includes('.')) {
          flushList();
          elements.push(
            <div
              key={`h-${blockIdx}-${lineIdx}`}
              className="text-[var(--text-primary)] font-semibold text-sm mt-4 mb-1 first:mt-0 landing-display"
            >
              {trimmed.replace(/:\s*$/, '')}
            </div>,
          );
          return;
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          currentList.push(trimmed.substring(2));
          return;
        }

        flushList();
        elements.push(
          <p
            key={`p-${blockIdx}-${lineIdx}`}
            className="text-[var(--text-secondary)] text-sm leading-relaxed my-2 landing-body"
          >
            {formatInlineText(trimmed)}
          </p>,
        );
      });

      flushList();
    }
  });

  return <div className="formatted-content">{elements}</div>;
}
