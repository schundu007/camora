import { decodeError } from './ErrorDecoder';
import type { PlaygroundRunResult, PlaygroundLanguage } from '../../../lib/capra-api';

interface Props {
  result: PlaygroundRunResult | null;
  error: string | null;
  language: PlaygroundLanguage;
}

export function OutputPane({ result, error, language }: Props) {
  const eyebrow = (s: string) => (
    <span
      className="text-[9px] uppercase tracking-widest text-[#334155] font-medium"
      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
    >
      {s}
    </span>
  );

  if (!result && !error) {
    return (
      <div className="flex items-center justify-center h-full text-[#334155] text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Press ▶ Run to execute
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 h-full bg-[#0a0d12]">
        {eyebrow('Error')}
        <pre className="mt-2 text-[#f87171] text-[11px] font-mono whitespace-pre-wrap break-words">{error}</pre>
      </div>
    );
  }

  const { stdout, stderr, exitCode, duration } = result!;
  const decoded = language === 'python3' && stderr ? decodeError(stderr) : null;

  return (
    <div className="flex flex-col h-full bg-[#0a0d12] overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e293b] sticky top-0 bg-[#0a0d12]">
        {eyebrow('Output')}
        <span
          className={`text-[9px] font-semibold ${exitCode === 0 ? 'text-[#10b981]' : 'text-[#f87171]'}`}
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          exit {exitCode} · {duration}ms
        </span>
      </div>

      {/* Stdout */}
      {stdout && (
        <div className="px-4 py-3 border-b border-[#1e293b]">
          {eyebrow('stdout')}
          <pre className="mt-1 text-[#10b981] text-[11px] font-mono whitespace-pre-wrap break-words leading-relaxed">
            {stdout}
          </pre>
        </div>
      )}

      {/* Stderr */}
      {stderr && (
        <div className="px-4 py-3 border-b border-[#1e293b]">
          {eyebrow('stderr')}
          <pre className="mt-1 text-[#f87171] text-[11px] font-mono whitespace-pre-wrap break-words leading-relaxed">
            {stderr}
          </pre>
        </div>
      )}

      {/* Error Decoder */}
      {decoded && (
        <div className="mx-4 my-3 p-3 rounded-md bg-[#1c1008] border border-[#44230a]">
          <span className="text-[9px] uppercase tracking-widest text-[#b45309] font-semibold block mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            What went wrong
          </span>
          <p className="text-[#fbbf24] text-[12px] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {decoded}
          </p>
        </div>
      )}

      {/* No output on success */}
      {!stdout && !stderr && exitCode === 0 && (
        <div className="px-4 py-3 text-[#334155] text-[11px] italic" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          (no output)
        </div>
      )}
    </div>
  );
}
