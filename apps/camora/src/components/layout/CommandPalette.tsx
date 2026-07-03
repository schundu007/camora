import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Types ───────────────────────────────────────────────────── */

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  path: string;
  category: string;   // group header: 'Pages' | 'Lumora' | 'Prepare'
  icon: string;
  color?: string;
  badge?: string;     // small badge label (section the topic belongs to)
  keywords?: string;  // precomputed lowercased haystack for matching
}

/* ── Static pages / features ─────────────────────────────────────
   Every path here is a real route in App.tsx — no dead links.        */

const PAGES: SearchResult[] = [
  { id: 'page-prepare', title: 'Prepare', path: '/capra/prepare', category: 'Pages', icon: 'home' },
  { id: 'page-practice', title: 'Practice', path: '/capra/practice', category: 'Pages', icon: 'play' },
  { id: 'page-quiz', title: 'Quiz', path: '/capra/quiz', category: 'Pages', icon: 'list' },
  { id: 'page-flashcards', title: 'Flashcards', path: '/capra/flashcards', category: 'Pages', icon: 'list' },
  { id: 'page-plan', title: 'Prep Plan', path: '/capra/plan', category: 'Pages', icon: 'list' },
  { id: 'page-resume', title: 'Resume', path: '/capra/resume', category: 'Pages', icon: 'list' },
  { id: 'page-library', title: 'HR Library', path: '/capra/library', category: 'Pages', icon: 'list' },
  { id: 'page-blind75', title: 'Blind 75', path: '/handbook', category: 'Pages', icon: 'list' },
  { id: 'page-playground', title: 'Playground', path: '/playground', category: 'Pages', icon: 'play' },
  { id: 'page-jobs', title: 'Jobs', path: '/jobs', category: 'Pages', icon: 'briefcase' },
  { id: 'page-achievements', title: 'Achievements', path: '/capra/achievements', category: 'Pages', icon: 'trophy' },
  { id: 'page-pricing', title: 'Pricing', path: '/pricing', category: 'Pages', icon: 'tag' },
  { id: 'page-learn-python', title: 'Learn Python', path: '/capra/learn/python', category: 'Pages', icon: 'list' },
  { id: 'page-learn-codesignal', title: 'Learn: CodeSignal', path: '/capra/learn/codesignal', category: 'Pages', icon: 'list' },
  { id: 'page-learn-programiz', title: 'Learn: Programiz', path: '/capra/learn/programiz', category: 'Pages', icon: 'list' },
  // Lumora live-interview features
  { id: 'lum-live', title: 'Live Session', path: '/lumora', category: 'Lumora', icon: 'mic' },
  { id: 'lum-coding', title: 'Lumora Coding', path: '/lumora/coding', category: 'Lumora', icon: 'mic' },
  { id: 'lum-design', title: 'Lumora Design', path: '/lumora/design', category: 'Lumora', icon: 'mic' },
  { id: 'lum-behavioral', title: 'Lumora Behavioral', path: '/lumora/behavioral', category: 'Lumora', icon: 'mic' },
  { id: 'lum-practice', title: 'Lumora Practice', path: '/lumora/practice', category: 'Lumora', icon: 'mic' },
  { id: 'lum-sessions', title: 'Session History', path: '/lumora/sessions', category: 'Lumora', icon: 'mic' },
  { id: 'lum-assistants', title: 'Assistants', path: '/lumora/assistants', category: 'Lumora', icon: 'mic' },
  { id: 'lum-playground', title: 'Lumora Playground', path: '/lumora/playground', category: 'Lumora', icon: 'play' },
].map((p) => ({ ...p, keywords: p.title.toLowerCase() }));

/* ── Lazy topic index ────────────────────────────────────────────
   Topic data is large and split into per-category chunks (loader.js).
   Building the index eagerly would bloat every route's bundle, so we
   load it on first palette open and cache the result module-wide.     */

// Pages served by loader.js's HEAVY_TOPIC_LOADERS → [dataKey(s)].
const LAZY_PAGE_KEYS: Record<string, string[]> = {
  coding: ['codingTopics'],
  'system-design': ['systemDesignTopics', 'systemDesignExtraTopics', 'systemDesigns'],
  'low-level': ['lldTopics', 'lldProblems'],
  behavioral: ['behavioralTopics'],
  projects: ['projectTopics'],
  sre: ['sreTopics'],
  devops: ['devopsTopics'],
  challenges: ['challengesTopics'],
  observability: ['observabilityTopics'],
  platform: ['platformTopics'],
  ddia: ['ddiaTopics'],
  mlops: ['mlopsTopics'],
  'ai-systems-perf': ['aiSystemsPerfTopics'],
  aiops: ['aiopsTopics'],
  agentic: ['agenticTopics'],
  cloud: ['cloudTopics'],
  linux: ['linuxTopics'],
  networking: ['networkingTopics'],
  troubleshooting: ['troubleshootingTopics'],
  'war-stories': ['warStoriesTopics'],
  comparisons: ['comparisonTopics'],
};

const PAGE_LABEL: Record<string, string> = {
  coding: 'DSA', 'system-design': 'System Design', 'low-level': 'Low-Level Design',
  behavioral: 'Behavioral', databases: 'Databases', microservices: 'Microservices',
  ddia: 'DDIA', cloud: 'Cloud', linux: 'Linux', networking: 'Networking', sre: 'SRE',
  devops: 'DevOps', observability: 'Observability', platform: 'Platform', mlops: 'MLOps',
  aiops: 'AIOps', 'ai-systems-perf': 'AI Systems Perf', agentic: 'Agentic',
  challenges: 'Challenges', troubleshooting: 'Troubleshooting', 'war-stories': 'War Stories',
  comparisons: 'Comparisons', projects: 'Projects', roadmaps: 'Roadmaps', 'eng-blogs': 'Eng Blogs',
};

interface RawTopic { id?: string; title?: string; subtitle?: string; description?: string; icon?: string; color?: string; tags?: string[]; concepts?: string[]; }

let CACHED_TOPIC_ITEMS: SearchResult[] | null = null;
let INFLIGHT: Promise<SearchResult[]> | null = null;

function toItem(t: RawTopic, page: string): SearchResult | null {
  if (!t || !t.id || !t.title) return null;
  const haystack = [t.title, t.subtitle, t.description, t.id, ...(t.tags || []), ...(t.concepts || [])]
    .filter(Boolean).join(' ').toLowerCase();
  return {
    id: `${page}:${t.id}`,
    title: t.title,
    path: `/capra/prepare?page=${page}&topic=${t.id}`,
    category: 'Prepare',
    icon: t.icon || '',
    color: t.color,
    badge: PAGE_LABEL[page] || 'Prepare',
    keywords: haystack,
  };
}

async function loadTopicItems(): Promise<SearchResult[]> {
  if (CACHED_TOPIC_ITEMS) return CACHED_TOPIC_ITEMS;
  if (INFLIGHT) return INFLIGHT;
  INFLIGHT = (async () => {
    const [loaderMod, dbMod, sqlMod, microMod, roadmapMod, engMod, concMod, patMod, tradeMod, scaleMod, companyMod] =
      await Promise.all([
        import('../../data/capra/topics/loader'),
        import('../../data/capra/topics/databaseTopics'),
        import('../../data/capra/topics/sqlTopics'),
        import('../../data/capra/topics/microservicesPatterns'),
        import('../../data/capra/topics/roadmapTopics'),
        import('../../data/capra/topics/engBlogsTopics'),
        import('../../data/capra/topics/concurrencyTopics'),
        import('../../data/capra/topics/systemDesignPatterns'),
        import('../../data/capra/topics/systemDesignTradeoffs'),
        import('../../data/capra/topics/scalableSystemsTopics'),
        import('../../data/capra/topics/companyPrep'),
      ]);

    const items: SearchResult[] = [];
    const seen = new Set<string>();
    const push = (arr: RawTopic[] | undefined, page: string) => {
      for (const t of arr || []) {
        const item = toItem(t, page);
        if (item && !seen.has(item.id)) { seen.add(item.id); items.push(item); }
      }
    };

    // Lazy pages via loader.js
    const loaded = await Promise.all(
      Object.keys(LAZY_PAGE_KEYS).map((p) =>
        loaderMod.loadTopicsForPage(p).then((data: Record<string, unknown>) => [p, data] as const).catch(() => [p, {}] as const)
      )
    );
    for (const [page, data] of loaded) {
      for (const key of LAZY_PAGE_KEYS[page]) push(data[key] as RawTopic[], page);
    }

    // Statically-chunked categories not covered by loader.js
    push(dbMod.databaseTopics as RawTopic[], 'databases');
    push(sqlMod.sqlTopics as RawTopic[], 'databases');
    push(microMod.microservicesPatterns as RawTopic[], 'microservices');
    push(roadmapMod.roadmapTopics as RawTopic[], 'roadmaps');
    push(engMod.engBlogTopics as RawTopic[], 'eng-blogs');
    // System-design sub-sections that live in their own static modules
    push(concMod.concurrencyTopics as RawTopic[], 'system-design');
    push(patMod.systemDesignPatterns as RawTopic[], 'system-design');
    push(tradeMod.systemDesignTradeoffs as RawTopic[], 'system-design');
    push(scaleMod.scalableSystemsTopics as RawTopic[], 'system-design');
    // Company-specific behavioral prep
    push(companyMod.companyPrep as RawTopic[], 'behavioral');

    CACHED_TOPIC_ITEMS = items;
    return items;
  })();
  return INFLIGHT;
}

/* ── Category icons (SVG paths) ──────────────────────────────── */

function CategoryIcon({ name, color }: { name: string; color?: string }) {
  const c = color || 'var(--text-muted)';
  const props = {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: c,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'home':
      return <svg {...props}><path d="M2 6.5L8 2l6 4.5V13a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" /><path d="M6 14V9h4v5" /></svg>;
    case 'play':
      return <svg {...props}><polygon points="4,2 14,8 4,14" fill={c} stroke="none" /></svg>;
    case 'briefcase':
      return <svg {...props}><rect x="2" y="5" width="12" height="9" rx="1" /><path d="M5 5V3.5A1.5 1.5 0 016.5 2h3A1.5 1.5 0 0111 3.5V5" /></svg>;
    case 'mic':
      return <svg {...props}><rect x="5.5" y="1" width="5" height="8" rx="2.5" /><path d="M3 7.5a5 5 0 0010 0" /><path d="M8 12.5V15" /></svg>;
    case 'tag':
      return <svg {...props}><path d="M2 2h5.5l7 7-5.5 5.5-7-7V2z" /><circle cx="5.5" cy="5.5" r="1" fill={c} stroke="none" /></svg>;
    case 'list':
      return <svg {...props}><path d="M3 4h10M3 8h10M3 12h10" /></svg>;
    case 'trophy':
      return <svg {...props}><path d="M4 2h8v5a4 4 0 01-8 0V2z" /><path d="M8 11v2" /><path d="M5 14h6" /><path d="M4 3H2v2a2 2 0 002 2" /><path d="M12 3h2v2a2 2 0 01-2 2" /></svg>;
    default:
      // Generic dot for topic icons
      return (
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ background: c, opacity: 0.8 }}
        />
      );
  }
}

/* ── Category badge ──────────────────────────────────────────── */

function Badge({ label }: { label: string }) {
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0"
      style={{
        background: 'var(--accent-subtle)',
        color: 'var(--accent)',
      }}
    >
      {label}
    </span>
  );
}

/* ── Component ───────────────────────────────────────────────── */

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [topicItems, setTopicItems] = useState<SearchResult[]>(CACHED_TOPIC_ITEMS || []);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Lazy-load the full topic index the first time the palette opens.
  useEffect(() => {
    if (!isOpen || CACHED_TOPIC_ITEMS) return;
    let cancelled = false;
    setLoading(true);
    loadTopicItems()
      .then((items) => { if (!cancelled) setTopicItems(items); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen]);

  const allItems = useMemo(() => [...PAGES, ...topicItems], [topicItems]);

  // Filter results — multi-word AND over the precomputed keyword haystack.
  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) {
      // Empty query: show all pages/features + a few topics as a preview.
      return [...PAGES, ...topicItems.slice(0, 8)];
    }
    return allItems
      .filter((item) => {
        const hay = item.keywords || item.title.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 50);
  }, [query, allItems, topicItems]);

  // Group results by category (Pages, Lumora, Prepare)
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      const list = map.get(r.category) || [];
      list.push(r);
      map.set(r.category, list);
    }
    return map;
  }, [results]);

  // Flat list for keyboard nav
  const flatResults = useMemo(() => {
    const flat: SearchResult[] = [];
    for (const items of grouped.values()) {
      flat.push(...items);
    }
    return flat;
  }, [grouped]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      // Focus input after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Select handler
  const handleSelect = useCallback(
    (item: SearchResult) => {
      navigate(item.path);
      onClose();
    },
    [navigate, onClose],
  );

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (flatResults.length) setActiveIndex((i) => (i + 1) % flatResults.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (flatResults.length) setActiveIndex((i) => (i - 1 + flatResults.length) % flatResults.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (flatResults[activeIndex]) {
            handleSelect(flatResults[activeIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatResults, activeIndex, handleSelect, onClose],
  );

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] sm:pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      {/* Dialog */}
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {/* Search icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{ color: 'var(--text-muted)', flexShrink: 0 }}
          >
            <circle cx="7" cy="7" r="5.5" />
            <path d="M11 11l3.5 3.5" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, pages..."
            className="flex-1 py-3.5 bg-transparent outline-none text-sm"
            style={{
              color: 'var(--text-primary)',
              caretColor: 'var(--accent)',
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto py-2"
          role="listbox"
        >
          {flatResults.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {loading ? 'Loading topics…' : 'No results found'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dimmed)' }}>
                {loading ? 'Indexing all sections' : 'Try a different search term'}
              </p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category}>
                {/* Category header */}
                <div
                  className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {category}
                </div>
                {/* Items */}
                {items.map((item) => {
                  flatIndex++;
                  const isActive = flatIndex === activeIndex;
                  const idx = flatIndex; // capture for click
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                      style={{
                        background: isActive ? 'var(--bg-elevated)' : 'transparent',
                        color: 'var(--text-primary)',
                      }}
                      data-active={isActive}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <CategoryIcon name={item.icon} color={item.color} />
                      <span className="flex-1 text-sm truncate">{item.title}</span>
                      <Badge label={item.badge || item.category} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4 px-4 py-2 text-[10px]"
          style={{
            borderTop: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          <span className="flex items-center gap-1">
            <kbd
              className="px-1 py-0.5 rounded"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              &uarr;&darr;
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd
              className="px-1 py-0.5 rounded"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              &crarr;
            </kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd
              className="px-1 py-0.5 rounded"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              esc
            </kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
