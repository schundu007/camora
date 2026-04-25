/* ── HistoryAnswerViewer + TabLoading
   Lifted out of LumoraShellPage.tsx. HistoryAnswerViewer is opened when the
   user clicks a past question on Home; the persisted ParsedBlock array is
   piped back through AnswerBlocks so coding/design/behavioral entries render
   with the same fidelity they had when first streamed. */
import { AnswerBlocks } from '../../../components/lumora/interview/AnswerBlocks';
import { DESIGN_BLOCK_TYPES, CODING_BLOCK_TYPES } from '../../../lib/constants';
import type { ParsedBlock } from '../../../types';

export function HistoryAnswerViewer({
  entry,
  onClose,
}: {
  entry: { question: string; blocks: ParsedBlock[]; timestamp: Date | string };
  onClose: () => void;
}) {
  // Normalize legacy coding entries where `blocks` was stored as the raw
  // { json: {...}, format: 'ascend_json' } payload from the coding backend
  // instead of a ParsedBlock[]. Convert on-the-fly so those sessions still
  // render instead of hitting "No answer saved".
  const normaliseBlocks = (raw: any): ParsedBlock[] => {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      const json = raw.json || (raw.solutions ? raw : null);
      if (json && typeof json === 'object') {
        const out: any[] = [];
        const sol = json.solutions?.[0] || json;
        const lang = json.language || 'python';
        if (sol.approach) out.push({ type: 'APPROACH', content: sol.approach });
        if (sol.code) out.push({ type: 'CODE', content: sol.code, language: lang });
        if (sol.complexity?.time || sol.complexity?.space) {
          out.push({ type: 'COMPLEXITY', content: `TIME: ${sol.complexity.time || 'n/a'}\nSPACE: ${sol.complexity.space || 'n/a'}` });
        }
        if (sol.narration) out.push({ type: 'WALKTHROUGH', content: sol.narration });
        if (Array.isArray(sol.trace) && sol.trace.length) {
          out.push({ type: 'WALKTHROUGH', content: sol.trace.map((s: any) => `${s.step}. ${s.action} → ${s.state}`).join('\n') });
        }
        return out;
      }
    }
    return [];
  };
  const blocks = normaliseBlocks(entry.blocks);
  const isDesign = blocks.some(b => (DESIGN_BLOCK_TYPES as readonly string[]).includes(b.type));
  const isCoding = !isDesign && blocks.some(b => (CODING_BLOCK_TYPES as readonly string[]).includes(b.type));
  const ts = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: '#FFFFFF' }}>
      <div className="flex items-center gap-3 h-12 px-5 shrink-0" style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors hover:bg-black/5"
          style={{ color: '#0F172A', border: '1px solid #E2E8F0', background: '#FFFFFF' }}
          title="Back to home"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded" style={{ background: 'rgba(34,211,238,0.1)', color: '#0E7490' }}>
            Past Answer
          </span>
          <span className="text-[13px] font-semibold truncate" style={{ color: '#0F172A' }}>{entry.question}</span>
        </div>
        <span className="ml-auto text-[10px] shrink-0" style={{ color: '#94A3B8' }}>
          {!isNaN(ts.getTime()) ? ts.toLocaleString() : ''}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-5 py-5">
        {blocks.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-16" style={{ color: '#94A3B8' }}>
            <p className="text-sm font-medium" style={{ color: '#0F172A' }}>No answer saved</p>
            <p className="text-xs mt-1">This entry has no stored answer blocks. Re-ask the question to regenerate.</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <AnswerBlocks blocks={blocks} isDesign={isDesign} isCoding={isCoding} question={entry.question} />
          </div>
        )}
      </div>
    </div>
  );
}

export function TabLoading({ label }: { label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#FFFFFF' }}>
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400" style={{ fontFamily: 'var(--font-sans)' }}>Loading {label}...</span>
      </div>
    </div>
  );
}
