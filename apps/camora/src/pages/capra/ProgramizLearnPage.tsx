import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/shared/Icons.jsx';
import { PROGRAMIZ_PATHS } from '../../data/capra/programizPaths.js';
import Chip from '@/components/shared/ui/Chip';

type Level = 'beginner' | 'intermediate' | 'advanced';

interface LearnPath {
  slug: string;
  title: string;
  category: string;
  level: Level;
  url: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  basics:           'Basics',
  'control-flow':   'Control Flow',
  functions:        'Functions',
  'data-structures':'Data Structures',
  oop:              'OOP',
  advanced:         'Advanced',
};

const LEVEL_CHIP: Record<Level, { bg: string; text: string }> = {
  beginner:     { bg: 'color-mix(in oklab, #10b981 15%, var(--bg-elevated))', text: '#10b981' },
  intermediate: { bg: 'color-mix(in oklab, #f59e0b 15%, var(--bg-elevated))', text: '#f59e0b' },
  advanced:     { bg: 'color-mix(in oklab, #ef4444 15%, var(--bg-elevated))', text: '#ef4444' },
};

const CATEGORY_ACCENT: Record<string, string> = {
  basics:           'var(--cam-primary)',
  'control-flow':   'var(--cam-gold-leaf)',
  functions:        'var(--cam-primary)',
  'data-structures':'var(--cam-gold-leaf)',
  oop:              'var(--cam-primary)',
  advanced:         'var(--cam-gold-leaf)',
};

const LEVEL_TABS: { value: 'all' | Level; label: string }[] = [
  { value: 'all',          label: 'All' },
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
];

const CATEGORY_ORDER = ['basics', 'control-flow', 'functions', 'data-structures', 'oop', 'advanced'];

function PathCard({ path }: { path: LearnPath }) {
  const navigate = useNavigate();
  const chip = LEVEL_CHIP[path.level];

  const params = new URLSearchParams({
    title: path.title,
    source: 'programiz',
    category: path.category,
    level: path.level,
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
      <Chip>{path.level}</Chip>
    </button>
  );
}

function CategorySection({ category, paths }: { category: string; paths: LearnPath[] }) {
  const accent = CATEGORY_ACCENT[category] ?? 'var(--cam-primary)';
  const label = CATEGORY_LABELS[category] ?? category;

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

export default function ProgramizLearnPage() {
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | Level>('all');

  const filtered = useMemo<LearnPath[]>(() => {
    const q = query.toLowerCase();
    return (PROGRAMIZ_PATHS as LearnPath[]).filter(p => {
      if (levelFilter !== 'all' && p.level !== levelFilter) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, levelFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, LearnPath[]> = {};
    for (const p of filtered) {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    }
    return map;
  }, [filtered]);

  const orderedCategories = [
    ...CATEGORY_ORDER.filter(c => grouped[c]),
    ...Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header strip */}
      <div className="cam-hero-strip px-6 py-5" style={{ borderBottom: '1px solid var(--cam-gold-leaf)' }}>
        <div className="flex items-center gap-3 mb-1">
          <Icon name="book" className="w-5 h-5" style={{ color: 'var(--cam-gold-leaf)' }} />
          <h1 className="text-[15px] font-bold" style={{ color: 'var(--cam-gold-leaf)' }}>
            Programiz Python
          </h1>
          <Chip variant="gold">{PROGRAMIZ_PATHS.length} tutorials</Chip>
        </div>
        <p className="text-[12px]" style={{ color: 'var(--cam-strip-text-muted)' }}>
          Curated Python tutorials from Programiz — from basics to advanced topics.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-4 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-48" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <Icon name="search" className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search tutorials…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {LEVEL_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setLevelFilter(tab.value)}
              className="font-mono text-[11px] px-3 py-1 rounded-md transition-colors"
              style={{
                background: levelFilter === tab.value ? 'var(--cam-primary)' : 'transparent',
                color: levelFilter === tab.value ? 'white' : 'var(--text-muted)',
                fontWeight: levelFilter === tab.value ? 700 : 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 space-y-8 overflow-y-auto">
        {orderedCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No tutorials match your search.</span>
          </div>
        ) : (
          orderedCategories.map(cat => (
            <CategorySection key={cat} category={cat} paths={grouped[cat]} />
          ))
        )}
      </div>
    </div>
  );
}
