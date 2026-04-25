// TODO: remove dead component — not imported anywhere (verified against LandingPage.tsx and App.tsx)
import { useEffect, useState } from 'react';

const ACCENT = 'var(--cam-primary)';
const MONO = "'Source Code Pro', monospace";

type Phase = 'listening' | 'transcribing' | 'thinking' | 'responding' | 'done';

interface Question {
  text: string;
  columns: { label: string; items: string[] }[];
  latency: string;
}

const QUESTIONS: Question[] = [
  {
    text: 'Design a distributed rate limiter that handles millions of requests per second.',
    columns: [
      { label: 'Architecture', items: ['Token Bucket', 'Redis Cluster', 'Sliding Window'] },
      { label: 'Components', items: ['API Gateway', 'Rate Limiter', 'Config Store'] },
      { label: 'Trade-offs', items: ['Consistency', 'Memory', 'Latency'] },
    ],
    latency: '0.32s',
  },
  {
    text: 'Tell me about a time you led a team through a hard technical migration.',
    columns: [
      { label: 'STAR · Situation', items: ['Legacy monolith', '80-person org', 'Deadline in 2Q'] },
      { label: 'STAR · Action', items: ['Strangler pattern', 'Parallel dual-run', 'Weekly demos'] },
      { label: 'STAR · Result', items: ['0 downtime', '40% cost cut', 'Promo-worthy'] },
    ],
    latency: '0.28s',
  },
  {
    text: 'Find the longest palindromic substring in a string, optimal time.',
    columns: [
      { label: 'Approach', items: ["Manacher's Algo", 'Expand Center', 'DP fallback'] },
      { label: 'Steps', items: ['Preprocess', 'Track max', 'Return slice'] },
      { label: 'Complexity', items: ['O(n) time', 'O(n) space', 'No edge-bugs'] },
    ],
    latency: '0.24s',
  },
];

export default function LiveAIDemoCard() {
  const [qIdx, setQIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('listening');
  const [typed, setTyped] = useState(0);
  const q = QUESTIONS[qIdx];

  useEffect(() => {
    if (phase === 'listening') {
      const t = setTimeout(() => setPhase('transcribing'), 900);
      return () => clearTimeout(t);
    }
    if (phase === 'transcribing') {
      if (typed < q.text.length) {
        const t = setTimeout(() => setTyped((c) => c + 1), 28);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase('thinking'), 500);
      return () => clearTimeout(t);
    }
    if (phase === 'thinking') {
      const t = setTimeout(() => setPhase('responding'), 950);
      return () => clearTimeout(t);
    }
    if (phase === 'responding') {
      const t = setTimeout(() => setPhase('done'), 2200);
      return () => clearTimeout(t);
    }
    if (phase === 'done') {
      const t = setTimeout(() => {
        setQIdx((i) => (i + 1) % QUESTIONS.length);
        setTyped(0);
        setPhase('listening');
      }, 2600);
      return () => clearTimeout(t);
    }
  }, [phase, typed, q.text.length]);

  const isLive = phase === 'listening' || phase === 'transcribing';
  const showResponse = phase === 'responding' || phase === 'done';

  const phaseLabel = {
    listening: 'Listening',
    transcribing: 'Transcribing',
    thinking: 'Analyzing',
    responding: 'Transcribed',
    done: 'Transcribed',
  }[phase];

  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}
    >
      <style>{`
        @keyframes la-wave { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        @keyframes la-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.8); } }
        @keyframes la-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-4px); opacity: 1; } }
        @keyframes la-cursor { 50% { opacity: 0; } }
        @keyframes la-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(59,54,220,0); } 50% { box-shadow: 0 0 0 4px rgba(59,54,220,0.12); } }
        .la-cursor {
          display: inline-block;
          width: 2px;
          height: 14px;
          background: #0F172A;
          vertical-align: text-bottom;
          margin-left: 1px;
          animation: la-cursor 0.9s step-end infinite;
        }
      `}</style>

      {/* Transcribing section */}
      <div
        className="px-6 py-5 relative"
        style={{ borderBottom: '1px solid #F1F5F9' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: '#EF4444',
              animation: isLive ? 'la-dot 1.1s ease-in-out infinite' : 'none',
              opacity: isLive ? 1 : 0.35,
            }}
          />
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: '#EF4444', fontFamily: MONO, letterSpacing: '0.12em' }}
          >
            {phaseLabel}
          </span>

          {/* waveform */}
          <div className="flex items-center gap-[2px] h-4 ml-auto">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                style={{
                  display: 'block',
                  width: 2,
                  height: '100%',
                  borderRadius: 1,
                  background: '#EF4444',
                  transformOrigin: 'center',
                  animation: isLive
                    ? `la-wave ${0.75 + (i % 5) * 0.12}s ease-in-out ${(i % 6) * 0.06}s infinite`
                    : 'none',
                  transform: isLive ? undefined : 'scaleY(0.2)',
                  opacity: isLive ? 1 : 0.25,
                  transition: 'opacity 0.4s, transform 0.4s',
                }}
              />
            ))}
          </div>
        </div>

        <p
          className="text-sm leading-relaxed"
          style={{ color: '#0F172A', minHeight: 44 }}
        >
          {phase === 'listening' ? (
            <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>
              Waiting for the interviewer…
            </span>
          ) : (
            <>
              <span>&ldquo;{q.text.slice(0, typed)}</span>
              {phase === 'transcribing' && <span className="la-cursor" />}
              {typed >= q.text.length && <span>&rdquo;</span>}
            </>
          )}
        </p>
      </div>

      {/* AI Response */}
      <div className="px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: ACCENT,
              animation: phase === 'thinking' ? 'la-dot 0.55s ease-in-out infinite' : 'none',
            }}
          />
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: ACCENT, fontFamily: MONO, letterSpacing: '0.12em' }}
          >
            {phase === 'thinking' ? 'AI · Analyzing' : 'AI Response'}
          </span>
          {phase === 'thinking' && (
            <span className="flex items-center gap-1 ml-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: ACCENT,
                    animation: `la-bounce 1.1s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </span>
          )}
          <span
            className="ml-auto text-[10px]"
            style={{ color: '#94A3B8', fontFamily: MONO }}
          >
            {phase === 'done' ? `${q.latency}` : phase === 'responding' ? 'streaming…' : ''}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3" style={{ minHeight: 146 }}>
          {q.columns.map((col, ci) => (
            <div key={col.label}>
              <p
                className="text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{
                  color: '#94A3B8',
                  fontFamily: MONO,
                  letterSpacing: '0.1em',
                  opacity: showResponse ? 1 : 0,
                  transform: showResponse ? 'translateY(0)' : 'translateY(4px)',
                  transition: `opacity 0.35s ${ci * 0.15}s, transform 0.35s ${ci * 0.15}s`,
                }}
              >
                {col.label}
              </p>
              <div className="flex flex-col gap-1">
                {col.items.map((item, ii) => {
                  const delay = 0.25 + ci * 0.18 + ii * 0.22;
                  return (
                    <span
                      key={item}
                      className="text-xs px-2.5 py-1.5 rounded-md"
                      style={{
                        color: '#475569',
                        background: '#F8FAFC',
                        border: '1px solid #F1F5F9',
                        opacity: showResponse ? 1 : 0,
                        transform: showResponse ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.98)',
                        transition: `opacity 0.4s ${delay}s, transform 0.4s ${delay}s`,
                      }}
                    >
                      {item}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
