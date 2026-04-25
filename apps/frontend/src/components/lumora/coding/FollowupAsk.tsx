import { useState, useRef, useCallback } from 'react';
import { streamResponse } from '@/lib/sse-client';
import { getSystemContext } from '@/lib/lumora-assistant';

interface FollowupAskProps {
  problem: string;
  activeSolutionName?: string;
  activeSolutionCode?: string;
  token: string;
}

/**
 * Minimal, self-contained follow-up Q component for the Coding tab.
 * Takes a question like "why O(n) space?" and streams a SHORT-mode answer
 * that has the original problem + current solution as context — so the
 * candidate doesn't have to leave the tab to ask a clarifying question.
 */
export default function FollowupAsk({ problem, activeSolutionName, activeSolutionCode, token }: FollowupAskProps) {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(async () => {
    const trimmed = q.trim();
    if (!trimmed || !token || loading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setAnswer('');
    setError(null);

    const context = [
      `ORIGINAL PROBLEM:\n${problem.slice(0, 1200)}`,
      activeSolutionName ? `CURRENT SOLUTION: ${activeSolutionName}` : '',
      activeSolutionCode ? `SOLUTION CODE:\n${activeSolutionCode.slice(0, 800)}` : '',
    ].filter(Boolean).join('\n\n');

    const question = `[SHORT] ${trimmed}\n\n${context}`;
    let acc = '';
    try {
      await streamResponse({
        question,
        systemContext: getSystemContext(),
        token,
        signal: controller.signal,
        onToken: (d) => { if (d.t) { acc += d.t; setAnswer(acc); } },
        onError: (d) => setError(d.msg || 'Follow-up failed'),
        onComplete: () => setLoading(false),
      });
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message || 'Follow-up failed');
      setLoading(false);
    }
  }, [q, token, loading, problem, activeSolutionName, activeSolutionCode]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter') && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'rgba(59,54,220,0.05)', borderBottom: '1px solid rgba(59,54,220,0.12)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--cam-primary-dk)', fontFamily: "'Source Sans 3', sans-serif" }}>
          Ask a follow-up
        </span>
        <span className="ml-auto text-[9px]" style={{ color: '#94A3B8' }}>Context-aware · scoped to this problem</span>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={activeSolutionName ? `e.g. Why does ${activeSolutionName} use O(n) space?` : 'e.g. Why not sort first? What breaks at scale?'}
            disabled={loading}
            className="flex-1 bg-transparent outline-none text-[12px]"
            style={{ color: '#0F172A' }}
          />
          <button
            onClick={submit}
            disabled={loading || !q.trim()}
            className="text-[10px] font-bold uppercase tracking-wider rounded px-3 py-1 disabled:opacity-40"
            style={{ background: 'var(--cam-primary)', color: '#FFFFFF' }}>
            {loading ? '…' : 'Ask'}
          </button>
        </div>

        {error && (
          <div className="text-[11px] px-2 py-1.5 rounded" style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA' }}>
            {error}
          </div>
        )}

        {(answer || loading) && (
          <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(59,54,220,0.04)', border: '1px solid rgba(59,54,220,0.15)' }}>
            <p className="text-[12px] leading-[1.55] whitespace-pre-wrap" style={{ color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>
              {answer || <span style={{ color: '#64748B' }}>Thinking…</span>}
              {loading && answer && <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm" style={{ background: 'var(--cam-primary)', verticalAlign: 'middle' }} />}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
