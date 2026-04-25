import { useState } from 'react';
import { useInterviewStore } from '@/stores/interview-store';
import { dialogConfirm } from '@/components/shared/Dialog';

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntry: (index: number) => void;
}

function groupByDate(history: { question: string; timestamp: Date }[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: { question: string; index: number; time: Date }[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This Week', items: [] },
    { label: 'Older', items: [] },
  ];

  history.forEach((entry, idx) => {
    const t = new Date(entry.timestamp);
    const item = { question: entry.question, index: idx, time: t };
    if (t >= today) groups[0].items.push(item);
    else if (t >= yesterday) groups[1].items.push(item);
    else if (t >= weekAgo) groups[2].items.push(item);
    else groups[3].items.push(item);
  });

  // Reverse items within each group (newest first)
  groups.forEach(g => g.items.reverse());

  return groups.filter(g => g.items.length > 0);
}

export function SessionSidebar({ isOpen, onClose, onSelectEntry }: SessionSidebarProps) {
  const { history, clearHistory, removeHistoryEntry } = useInterviewStore();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const groups = groupByDate(history);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative top-0 left-0 h-full z-50 lg:z-auto flex flex-col transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0 w-[75vw] sm:w-[280px]' : '-translate-x-full lg:translate-x-0 w-0 lg:w-0'
        }`}
        style={{
          background: 'linear-gradient(180deg, var(--cam-primary) 0%, #000000 100%)',
          borderRight: isOpen ? '1px solid rgba(255,255,255,0.2)' : 'none',
          boxShadow: isOpen ? '2px 0 12px rgba(0,0,0,0.2)' : 'none',
        }}
      >
        {isOpen && (
          <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 shrink-0">
              <span className="text-xs font-mono font-bold text-white/80 uppercase tracking-widest">History</span>
              <div className="flex items-center gap-1">
                {history.length > 0 && (
                  <button
                    onClick={async () => { const ok = await dialogConfirm({ title: 'Clear all history?', message: 'This will permanently remove every saved session.', confirmLabel: 'Clear all', tone: 'danger' }); if (ok) clearHistory(); }}
                    className="text-[10px] font-mono text-white/70 hover:text-red-400 px-2 py-1 rounded transition-colors"
                    title="Clear all"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-white/60 hover:text-white/80 hover:bg-[var(--bg-surface)]/5 transition-colors lg:hidden"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
              {groups.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-xs text-white/70 font-mono">No questions yet</p>
                  <p className="text-[10px] text-white/60 mt-1">Ask a question to start</p>
                </div>
              ) : (
                groups.map(group => (
                  <div key={group.label} className="mb-3">
                    <div className="px-4 py-1.5">
                      <span className="text-[10px] font-mono font-bold text-white/70 uppercase tracking-widest">{group.label}</span>
                    </div>
                    {group.items.map(item => (
                      <div
                        key={item.index}
                        className="group relative"
                        onMouseEnter={() => setHoveredIdx(item.index)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      >
                        <button
                          onClick={() => { onSelectEntry(item.index); if (window.innerWidth < 1024) onClose(); }}
                          className="w-full text-left px-4 py-2 text-[13px] text-white/80 hover:text-white/90 hover:bg-white/15 transition-all truncate block"
                        >
                          {item.question}
                        </button>
                        {/* Delete on hover */}
                        {hoveredIdx === item.index && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeHistoryEntry(item.index); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-white/70 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Remove"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Footer — Q&A count */}
            {history.length > 0 && (
              <div className="px-4 py-2.5 border-t border-white/20 shrink-0">
                <span className="text-[10px] font-mono text-white/70">{history.length} question{history.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
