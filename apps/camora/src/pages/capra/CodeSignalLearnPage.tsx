import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/shared/Icons.jsx';
import { CODESIGNAL_LEARN_PATHS } from '../../data/capra/codesignalLearnPaths.js';
import Chip from '@/components/shared/ui/Chip';

type Difficulty = 'easy' | 'medium' | 'hard';

interface LearnPath {
  slug: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  practiceCount: number;
  urlSlug: string;
}

const TOPIC_LABELS: Record<string, string> = {
  general: 'General',
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  dsa: 'DSA',
  sql: 'SQL',
  searching: 'Searching',
  graphs: 'Graphs',
};

const DIFF_CHIP: Record<Difficulty, { bg: string; text: string }> = {
  easy:   { bg: 'color-mix(in oklab, var(--cam-success) 15%, var(--bg-elevated))', text: 'var(--cam-success)' },
  medium: { bg: 'color-mix(in oklab, var(--warning) 15%, var(--bg-elevated))', text: 'var(--warning)' },
  hard:   { bg: 'color-mix(in oklab, var(--danger) 15%, var(--bg-elevated))', text: 'var(--danger)' },
};

const TOPIC_ACCENT: Record<string, string> = {
  python:     'var(--cam-primary)',
  javascript: 'var(--cam-gold-leaf)',
  java:       'var(--cam-primary)',
  dsa:        'var(--cam-primary)',
  sql:        'var(--cam-gold-leaf)',
  general:    'var(--cam-primary)',
  searching:  'var(--cam-primary)',
  graphs:     'var(--cam-gold-leaf)',
};

const DIFF_TABS: { value: 'all' | Difficulty; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

function PathCard({ path }: { path: LearnPath }) {
  const navigate = useNavigate();
  const diff = DIFF_CHIP[path.difficulty];

  const params = new URLSearchParams({
    title: path.title,
    source: 'codesignal',
    topic: path.topic,
    difficulty: path.difficulty,
    count: String(path.practiceCount),
  });

  return (
    <button
      type="button"
      onClick={() => navigate(`/capra/learn/topic/${path.slug}?${params}`)}
      className="flex flex-col gap-3 rounded-xl p-4 text-left w-full"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        transition: 'border-color 0.15s, background 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'color-mix(in oklab, var(--cam-gold-leaf) 50%, transparent)';
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)';
      }}
    >
      <span className="text-[13px] font-semibold leading-snug flex-1" style={{ color: 'var(--text-primary)' }}>
        {path.title}
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        <Chip variant={path.difficulty}>{path.difficulty}</Chip>
        {path.practiceCount > 0 && (
          <Chip>{path.practiceCount} tasks</Chip>
        )}
      </div>
    </button>
  );
}

function TopicSection({ topic, paths }: { topic: string; paths: LearnPath[] }) {
  const accent = TOPIC_ACCENT[topic] ?? 'var(--cam-primary)';
  const label = TOPIC_LABELS[topic] ?? topic;

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: accent }}>
          {label}
        </h2>
        <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{paths.length}</span>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {paths.map(p => <PathCard key={p.slug} path={p} />)}
      </div>
    </section>
  );
}

const TOPIC_ORDER = ['general', 'javascript', 'python', 'java', 'dsa', 'sql', 'searching', 'graphs'];

export default function CodeSignalLearnPage() {
  const [query, setQuery] = useState('');
  const [diffFilter, setDiffFilter] = useState<'all' | Difficulty>('all');

  const filtered = useMemo<LearnPath[]>(() => {
    const q = query.toLowerCase();
    return (CODESIGNAL_LEARN_PATHS as LearnPath[]).filter(p => {
      if (diffFilter !== 'all' && p.difficulty !== diffFilter) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.topic.includes(q)) return false;
      return true;
    });
  }, [query, diffFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, LearnPath[]> = {};
    for (const p of filtered) {
      if (!map[p.topic]) map[p.topic] = [];
      map[p.topic].push(p);
    }
    return map;
  }, [filtered]);

  const topicOrder = TOPIC_ORDER.filter(t => grouped[t]);
  const otherTopics = Object.keys(grouped).filter(t => !TOPIC_ORDER.includes(t));

  return (
    <div className="flex flex-col min-h-full">
      {/* Header strip */}
      <div className="cam-hero-strip px-6 py-5" style={{ borderBottom: '1px solid var(--cam-gold-leaf)' }}>
        <div className="flex items-center gap-3 mb-1">
          <Icon name="book" className="w-5 h-5" style={{ color: 'var(--cam-gold-leaf)' }} />
          <h1 className="text-[15px] font-bold" style={{ color: 'var(--cam-gold-leaf)' }}>
            CodeSignal Learn
          </h1>
          <Chip variant="gold">{(CODESIGNAL_LEARN_PATHS as LearnPath[]).length} paths</Chip>
        </div>
        <p className="text-[12px]" style={{ color: 'var(--cam-strip-text-muted)' }}>
          421 learning paths from CodeSignal. Use the search or filter to find topics.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-4 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-48" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <Icon name="search" className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search paths…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {DIFF_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setDiffFilter(tab.value)}
              className="px-3 py-1 rounded-md text-[12px] font-medium transition-all"
              style={diffFilter === tab.value ? {
                background: 'var(--cam-gold-leaf)',
                color: 'var(--cam-navy)',
              } : {
                background: 'transparent',
                color: 'var(--text-muted)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 space-y-8 mx-auto w-full max-w-7xl">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16" style={{ color: 'var(--text-muted)' }}>
            <Icon name="search" className="w-8 h-8 opacity-30" />
            <p className="text-[13px]">No paths match your filters.</p>
          </div>
        ) : (
          <>
            {[...topicOrder, ...otherTopics].map(topic => (
              <TopicSection key={topic} topic={topic} paths={grouped[topic]} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
