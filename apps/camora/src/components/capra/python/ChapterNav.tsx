import { useState, useEffect } from 'react';
import { CHAPTERS, type Topic } from '@/data/python';

export const TopicButton = ({ topic, active, onClick }: { topic: Topic; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className="w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between gap-2"
    style={{
      background: active ? 'color-mix(in oklab, var(--cam-gold-leaf) 12%, var(--bg-elevated))' : 'transparent',
      border: active ? '1px solid color-mix(in oklab, var(--cam-gold-leaf) 40%, transparent)' : '1px solid transparent',
    }}
    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; }}
    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
    <span className={`text-[13px] ${active ? 'font-semibold' : 'font-medium'}`}
      style={{ color: active ? 'var(--cam-gold-leaf-dk)' : 'var(--text-secondary)' }}>
      {topic.title}
    </span>
    <span className="font-mono text-[12px] shrink-0" style={{ color: 'var(--text-muted)' }}>{topic.estimatedMins}m</span>
  </button>
);

export default function ChapterNav({ topics, selectedId, onSelect }: {
  topics: Topic[]; selectedId: string; onSelect: (id: string) => void;
}) {
  const activeChapter = topics.find(t => t.id === selectedId)?.chapter;
  const [open, setOpen] = useState<string | null>(activeChapter ?? null);
  useEffect(() => { if (activeChapter) setOpen(activeChapter); }, [activeChapter]);

  return (
    <div className="space-y-4">
      {CHAPTERS.map(ch => {
        const inChapter = topics.filter(t => t.chapter === ch.id);
        if (!inChapter.length) return null;
        const isOpen = open === ch.id;
        return (
          <div key={ch.id}>
            <button
              onClick={() => setOpen(isOpen ? null : ch.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-2 mb-2 px-1"
            >
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ch.accent }} />
              <span className="font-mono text-[12px] font-bold uppercase tracking-widest text-left flex-1" style={{ color: ch.accent }}>
                {ch.label}
              </span>
              <span className="font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>{inChapter.length}</span>
            </button>
            <div className="space-y-0.5" hidden={!isOpen}>
              {inChapter.map(t => (
                <TopicButton key={t.id} topic={t} active={t.id === selectedId} onClick={() => onSelect(t.id)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
