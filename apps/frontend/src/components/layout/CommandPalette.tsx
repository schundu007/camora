import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { codingTopics } from '../../data/capra/topics/codingTopics';
import { systemDesignTopics } from '../../data/capra/topics/systemDesignTopics';
import { behavioralTopics } from '../../data/capra/topics/behavioralTopics';

/* ── Types ───────────────────────────────────────────────────── */

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  path: string;
  category: string;
  icon: string;
  color?: string;
}

/* ── Static pages ────────────────────────────────────────────── */

const PAGES: SearchResult[] = [
  { id: 'page-dashboard', title: 'Dashboard', path: '/capra/prepare', category: 'Pages', icon: 'home' },
  { id: 'page-practice', title: 'Practice', path: '/capra/practice', category: 'Pages', icon: 'play' },
  { id: 'page-jobs', title: 'Jobs', path: '/jobs', category: 'Pages', icon: 'briefcase' },
  { id: 'page-live', title: 'Live Interview', path: '/lumora', category: 'Pages', icon: 'mic' },
  { id: 'page-pricing', title: 'Pricing', path: '/pricing', category: 'Pages', icon: 'tag' },
  { id: 'page-blind75', title: 'Blind 75', path: '/handbook', category: 'Pages', icon: 'list' },
  { id: 'page-achievements', title: 'Achievements', path: '/profile?tab=achievements', category: 'Pages', icon: 'trophy' },
];

/* ── Build searchable items from topic data ──────────────────── */

function buildItems(): SearchResult[] {
  const items: SearchResult[] = [];

  for (const t of codingTopics as Array<{ id: string; title: string; icon: string; color: string }>) {
    items.push({
      id: `coding-${t.id}`,
      title: t.title,
      path: `/capra/prepare/coding/${t.id}`,
      category: 'Prepare',
      icon: t.icon,
      color: t.color,
    });
  }

  for (const t of systemDesignTopics as Array<{ id: string; title: string; icon: string; color: string }>) {
    items.push({
      id: `sd-${t.id}`,
      title: t.title,
      path: `/capra/prepare/system-design/${t.id}`,
      category: 'Prepare',
      icon: t.icon,
      color: t.color,
    });
  }

  for (const t of behavioralTopics as Array<{ id: string; title: string; icon: string; color: string }>) {
    items.push({
      id: `beh-${t.id}`,
      title: t.title,
      path: `/capra/prepare/behavioral/${t.id}`,
      category: 'Prepare',
      icon: t.icon,
      color: t.color,
    });
  }

  return [...items, ...PAGES];
}

const ALL_ITEMS = buildItems();

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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Filter results
  const results = useMemo(() => {
    if (!query.trim()) return ALL_ITEMS.slice(0, 20); // show first 20 when empty
    const q = query.toLowerCase();
    return ALL_ITEMS.filter((item) => item.title.toLowerCase().includes(q));
  }, [query]);

  // Group results by category
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
          setActiveIndex((i) => (i + 1) % flatResults.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + flatResults.length) % flatResults.length);
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
                No results found
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dimmed)' }}>
                Try a different search term
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
                      <Badge label={item.category} />
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
