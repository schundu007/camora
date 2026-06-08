import AnsiToHtml from 'ansi-to-html';
import { decodeError } from './ErrorDecoder';
import type { PlaygroundRunResult, PlaygroundLanguage } from '../../../lib/capra-api';

const ansiConverter = new AnsiToHtml({ escapeXML: true, newline: false });
function toHtml(text: string): string {
  return ansiConverter.toHtml(text);
}

export interface RunEntry {
  ts: Date;
  result: PlaygroundRunResult | null;
  error: string | null;
}

interface Props {
  runs: RunEntry[];
  language: PlaygroundLanguage;
  onClear: () => void;
}

const monoStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  letterSpacing: '-0.02em',
  WebkitFontSmoothing: 'antialiased',
};

const sans: React.CSSProperties = { fontFamily: 'Plus Jakarta Sans, sans-serif' };

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
}

const RunResult = ({ entry, language }: { entry: RunEntry; language: PlaygroundLanguage }) => {
  if (entry.error) {
    return <pre className="text-[#f87171] text-[11px] whitespace-pre-wrap break-words" style={monoStyle}>{entry.error}</pre>;
  }

  const { stdout, stderr, exitCode, duration } = entry.result!;
  const decoded = language === 'python3' && stderr ? decodeError(stderr) : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9px] font-semibold" style={{ ...sans, color: exitCode === 0 ? '#10b981' : '#f87171' }}>
          exit {exitCode} · {duration}ms
        </span>
      </div>
      {stdout && (
        <pre
          className="text-[#10b981] text-[11px] whitespace-pre-wrap break-words leading-relaxed"
          style={monoStyle}
          dangerouslySetInnerHTML={{ __html: toHtml(stdout) }}
        />
      )}
      {stderr && (
        <pre
          className="mt-1 text-[#f87171] text-[11px] whitespace-pre-wrap break-words leading-relaxed"
          style={monoStyle}
          dangerouslySetInnerHTML={{ __html: toHtml(stderr) }}
        />
      )}
      {decoded && (
        <div className="mt-2 p-3 rounded-md bg-[#1c1008] border border-[#44230a]">
          <span className="text-[9px] uppercase tracking-widest text-[#b45309] font-semibold block mb-1" style={sans}>
            What went wrong
          </span>
          <p className="text-[#fbbf24] text-[12px] leading-relaxed m-0" style={sans}>{decoded}</p>
        </div>
      )}
      {!stdout && !stderr && exitCode === 0 && (
        <span className="text-[#334155] text-[11px] italic" style={sans}>(no output)</span>
      )}
      {!stdout && !stderr && exitCode !== 0 && (
        <pre className="text-[#f87171] text-[11px] whitespace-pre-wrap" style={monoStyle}>
          Process exited with code {exitCode} (no output captured)
        </pre>
      )}
    </div>
  );
};

export const OutputPane = ({ runs, language, onClear }: Props) => {
  if (runs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#334155] text-sm" style={sans}>
        Press ▶ Run to execute
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0d12] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e293b] shrink-0 bg-[#0a0d12]">
        <span className="text-[9px] uppercase tracking-widest text-[#334155] font-medium" style={sans}>Output</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const text = runs
                .map(r => r.error ? r.error : [r.result?.stdout, r.result?.stderr].filter(Boolean).join('\n'))
                .join('\n---\n');
              navigator.clipboard.writeText(text);
            }}
            title="Copy all output"
            className="text-[#334155] hover:text-[#64748b] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
          <button
            onClick={onClear}
            title="Clear output"
            className="text-[#334155] hover:text-[#64748b] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Run log */}
      <div className="flex-1 overflow-auto">
        {runs.map((entry, i) => (
          <div key={i}>
            <div className="flex items-center gap-3 px-4 py-1.5">
              <span className="text-[10px] tabular-nums shrink-0" style={{ ...sans, color: '#334155' }}>
                {formatTime(entry.ts)}
              </span>
              <div className="flex-1 h-px bg-[#1e293b]" />
            </div>
            <div className="px-4 pb-3">
              <RunResult entry={entry} language={language} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
