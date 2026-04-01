import { Icon } from '../Icons.jsx';

export default function FormattedContent({ content, color = 'emerald' }) {
  if (!content) return null;

  // Use Ascend brand emerald colors
  const colors = {
    heading: 'text-emerald-400',
    bullet: 'text-emerald-400',
    highlight: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  };

  // Check if line looks like ASCII diagram (box drawing, arrows, pipes)
  const isDiagramLine = (line) => {
    if (/[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬▶▼◀▲→←↑↓►◄]/.test(line)) return true;
    if (/[|]{2,}|[-]{3,}|[─]{2,}|[=]{3,}/.test(line)) return true;
    if (/^\s*[|│┃├└┌╔╚╠]/.test(line)) return true;
    if (/──+[>▶►]|[<◀◄]──+|->|<-/.test(line)) return true;
    if (line.length > 10 && /^\s{4,}[│|├└┌]/.test(line)) return true;
    return false;
  };

  // Format inline text with bold, code, and quoted text
  const starColors = { 'Situation': '#3b82f6', 'Task': '#f59e0b', 'Action': '#10b981', 'Result': '#ef4444' };

  const formatInlineText = (text) => {
    const parts = [];
    let remaining = text;
    let keyCounter = 0;

    // Check for STAR keywords at the start of text
    const starMatch = remaining.match(/^(Situation|Task|Action|Result)\s*[:–—-]\s*/i);
    if (starMatch) {
      const keyword = starMatch[1].charAt(0).toUpperCase() + starMatch[1].slice(1).toLowerCase();
      const color = starColors[keyword] || '#a855f7';
      parts.push(
        <span key={keyCounter++} className="inline-flex items-center gap-1.5 mr-1.5">
          <span className="px-1.5 py-0.5 rounded text-xs font-extrabold text-white" style={{ background: color }}>{keyword.charAt(0)}</span>
          <span className="font-bold text-sm" style={{ color }}>{keyword}:</span>
        </span>
      );
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
          parts.push(<strong key={keyCounter++} className="text-gray-900 font-semibold">{nextMatch[1]}</strong>);
        } else if (matchType === 'code') {
          parts.push(<code key={keyCounter++} className={`${colors.highlight} px-1.5 py-0.5 rounded text-sm font-mono border`}>{nextMatch[1]}</code>);
        } else if (matchType === 'quote') {
          parts.push(<em key={keyCounter++} className="text-gray-900 italic">{nextMatch[1]}</em>);
        }
        remaining = remaining.substring(nextMatch.index + nextMatch[0].length);
      } else {
        parts.push(remaining);
        break;
      }
    }

    return parts.length > 0 ? parts : text;
  };

  // Split content into blocks: code blocks, diagrams, and text
  const blocks = [];
  let currentBlock = { type: 'text', lines: [], lang: null };
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBlockLang = null;

  lines.forEach((line) => {
    // Check for code block start/end
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        // Starting a code block
        if (currentBlock.lines.length > 0) {
          blocks.push(currentBlock);
        }
        codeBlockLang = line.trim().slice(3).trim() || 'code';
        currentBlock = { type: 'code', lines: [], lang: codeBlockLang };
        inCodeBlock = true;
      } else {
        // Ending a code block
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
        if (currentBlock.lines.length > 0) {
          blocks.push(currentBlock);
        }
        currentBlock = { type: 'diagram', lines: [], lang: null };
      }
      currentBlock.lines.push(line);
    } else {
      if (currentBlock.type !== 'text') {
        if (currentBlock.lines.length > 0) {
          blocks.push(currentBlock);
        }
        currentBlock = { type: 'text', lines: [], lang: null };
      }
      currentBlock.lines.push(line);
    }
  });

  if (currentBlock.lines.length > 0) {
    blocks.push(currentBlock);
  }

  // Render blocks
  const elements = [];

  blocks.forEach((block, blockIdx) => {
    if (block.type === 'code') {
      // Render code block with proper formatting
      elements.push(
        <div key={`code-${blockIdx}`} className="my-1 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
          {block.lang && block.lang !== 'code' && (
            <div className="px-4 py-1.5 text-xs landing-mono text-gray-500 border-b border-gray-200 bg-gray-100/50">
              {block.lang}
            </div>
          )}
          <pre
            className="p-4 text-sm leading-7 overflow-x-auto landing-mono text-gray-800"
            style={{ whiteSpace: 'pre', tabSize: 2, margin: 0 }}
          >
            {block.lines.join('\n')}
          </pre>
        </div>
      );
    } else if (block.type === 'diagram') {
      // Render diagram with preserved spacing
      elements.push(
        <div key={`diagram-${blockIdx}`} className="my-1 rounded-lg border border-gray-200 overflow-x-auto bg-gray-50">
          <pre
            className="p-4 text-sm leading-7 landing-mono text-emerald-800"
            style={{ whiteSpace: 'pre', tabSize: 4, margin: 0, overflow: 'visible' }}
          >
            {block.lines.join('\n')}
          </pre>
        </div>
      );
    } else {
      // Process text block
      let currentList = [];

      const flushList = () => {
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${elements.length}`} className="grid grid-cols-1 md:grid-cols-2 gap-1 my-1 ml-2">
              {currentList.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                  <span className="text-gray-800 text-sm leading-relaxed landing-body">{formatInlineText(item)}</span>
                </li>
              ))}
            </ul>
          );
          currentList = [];
        }
      };

      block.lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();

        // Skip empty lines
        if (!trimmed) {
          flushList();
          return;
        }

        // Bold section headers (with colon at end or space after)
        if (trimmed.match(/^\*\*[^*]+\*\*[:\s(]/) || (trimmed.startsWith('**') && trimmed.endsWith(':'))) {
          flushList();
          const headerText = trimmed.replace(/\*\*/g, '').replace(/:\s*$/, '');
          // Check if it's a STAR keyword
          const starKey = Object.keys(starColors).find(k => headerText.toLowerCase().startsWith(k.toLowerCase()));
          if (starKey) {
            const sc = starColors[starKey];
            const rest = headerText.slice(starKey.length).replace(/^[\s:–—-]+/, '');
            elements.push(
              <div key={`star-${blockIdx}-${lineIdx}`} className="flex items-center gap-2 mt-2 mb-0.5 first:mt-0">
                <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-extrabold text-white" style={{ background: sc }}>{starKey.charAt(0)}</span>
                <span className="text-sm font-bold" style={{ color: sc }}>{starKey}{rest ? ': ' + rest : ''}</span>
              </div>
            );
          } else {
            elements.push(
              <div key={`h-${blockIdx}-${lineIdx}`} className="text-blue-900 font-bold text-sm mt-3 mb-1.5 first:mt-0 landing-display">
                {headerText}
              </div>
            );
          }
          return;
        }

        // STAR keywords as styled headers
        const starHeaderMatch = trimmed.match(/^(Situation|Task|Action|Result)\s*[:]\s*$/i);
        if (starHeaderMatch) {
          flushList();
          const keyword = starHeaderMatch[1].charAt(0).toUpperCase() + starHeaderMatch[1].slice(1).toLowerCase();
          const sc = starColors[keyword] || '#a855f7';
          elements.push(
            <div key={`star-${blockIdx}-${lineIdx}`} className="flex items-center gap-2 mt-2 mb-0.5 first:mt-0">
              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-extrabold text-white" style={{ background: sc }}>{keyword.charAt(0)}</span>
              <span className="text-sm font-bold" style={{ color: sc }}>{keyword}</span>
            </div>
          );
          return;
        }

        // Section headers without bold (ending with colon)
        if (trimmed.endsWith(':') && trimmed.length < 50 && !trimmed.includes('.')) {
          flushList();
          elements.push(
            <div key={`h-${blockIdx}-${lineIdx}`} className="text-blue-900 font-bold text-sm mt-3 mb-1.5 first:mt-0 landing-display">
              {trimmed}
            </div>
          );
          return;
        }

        // List items
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          currentList.push(trimmed.substring(2));
          return;
        }

        // Regular paragraph
        flushList();
        elements.push(
          <p key={`p-${blockIdx}-${lineIdx}`} className="text-gray-800 text-sm leading-relaxed my-2 landing-body">
            {formatInlineText(trimmed)}
          </p>
        );
      });

      flushList();
    }
  });

  return <div className="formatted-content">{elements}</div>;
}
