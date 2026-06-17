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
    return <pre className="text-[11px] whitespace-pre-wrap break-words" style={{ ...monoStyle, color: 'var(--danger)' }}>{entry.error}</pre>;
  }

  const { stdout, stderr, exitCode, duration } = entry.result!;
  const decoded = language === 'python3' && stderr ? decodeError(stderr) : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9px] font-semibold" style={{ ...sans, color: exitCode === 0 ? '#10b981' : 'var(--danger)' }}>
          exit {exitCode} · {duration}ms
        </span>
      </div>
      {stdout && (
        <pre
          className="text-[11px] whitespace-pre-wrap break-words leading-relaxed"
          style={{ ...monoStyle, color: '#10b981' }}
          dangerouslySetInnerHTML={{ __html: toHtml(stdout) }}
        />
      )}
      {stderr && (
        <pre
          className="mt-1 text-[11px] whitespace-pre-wrap break-words leading-relaxed"
          style={{ ...monoStyle, color: 'var(--danger)' }}
          dangerouslySetInnerHTML={{ __html: toHtml(stderr) }}
        />
      )}
      {decoded && (
        <div className="mt-2 p-3 rounded-md" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <span className="text-[9px] uppercase tracking-widest font-semibold block mb-1" style={{ ...sans, color: 'var(--warning)' }}>
            What went wrong
          </span>
          <p className="text-[12px] leading-relaxed m-0" style={{ ...sans, color: 'var(--warning-text)' }}>{decoded}</p>
        </div>
      )}
      {!stdout && !stderr && exitCode === 0 && (
        <span className="text-[11px] italic" style={{ ...sans, color: 'var(--text-muted)' }}>(no output)</span>
      )}
      {!stdout && !stderr && exitCode !== 0 && (
        <pre className="text-[11px] whitespace-pre-wrap" style={{ ...monoStyle, color: 'var(--danger)' }}>
          Process exited with code {exitCode} (no output captured)
        </pre>
      )}
    </div>
  );
};

export const OutputPane = ({ runs, language, onClear }: Props) => {
  if (runs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ ...sans, color: 'var(--text-muted)' }}>
        Press ▶ Run to execute
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-[9px] uppercase tracking-widest font-medium" style={{ ...sans, color: 'var(--text-muted)' }}>Output</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const text = runs
                .map(r => r.error ? r.error : [r.result?.stdout, r.result?.stderr].filter(Boolean).join('\n'))
                .join('\n---\n');
              navigator.clipboard.writeText(text);
            }}
            title="Copy all output"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
          <button onClick={onClear} title="Clear output" style={{ color: 'var(--text-muted)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {runs.map((entry, i) => (
          <div key={i}>
            <div className="flex items-center gap-3 px-4 py-1.5">
              <span className="text-[10px] tabular-nums shrink-0" style={{ ...sans, color: 'var(--text-muted)' }}>
                {formatTime(entry.ts)}
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
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
