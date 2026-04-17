import { useState, useEffect } from 'react';

// Language data with icons - categories is an array to support multiple categories
const LANGUAGES = [
  // Core Languages
  { value: 'python3', label: 'Python 3', icon: '🐍', categories: ['all', 'data'] },
  { value: 'python2', label: 'Python 2', icon: '🐍', categories: ['all'] },
  { value: 'javascript', label: 'JavaScript', icon: 'JS', categories: ['all', 'frontend', 'backend'] },
  { value: 'typescript', label: 'TypeScript', icon: 'TS', categories: ['all', 'frontend', 'backend'] },
  { value: 'java', label: 'Java', icon: '☕', categories: ['all', 'backend', 'mobile'] },
  { value: 'c', label: 'C', icon: 'C', categories: ['all'] },
  { value: 'cpp', label: 'C++', icon: 'C+', categories: ['all'] },
  { value: 'csharp', label: 'C#', icon: 'C#', categories: ['all', 'backend'] },
  { value: 'go', label: 'Go', icon: 'Go', categories: ['all', 'backend', 'devops'] },
  { value: 'rust', label: 'Rust', icon: '🦀', categories: ['all'] },
  { value: 'ruby', label: 'Ruby', icon: '💎', categories: ['all', 'backend'] },
  { value: 'php', label: 'PHP', icon: '🐘', categories: ['all', 'backend'] },
  { value: 'swift', label: 'Swift 5', icon: '🕊️', categories: ['all', 'mobile'] },
  { value: 'kotlin', label: 'Kotlin', icon: 'K', categories: ['all', 'mobile'] },
  { value: 'scala', label: 'Scala', icon: 'S', categories: ['all', 'backend'] },
  { value: 'bash', label: 'Bash', icon: '$>', categories: ['all', 'devops'] },
  { value: 'perl', label: 'Perl', icon: '🐪', categories: ['all'] },
  { value: 'lua', label: 'Lua', icon: '🌙', categories: ['all'] },
  { value: 'r', label: 'R', icon: 'R', categories: ['all', 'data'] },
  { value: 'haskell', label: 'Haskell', icon: 'λ', categories: ['all'] },
  { value: 'clojure', label: 'Clojure', icon: '()', categories: ['all'] },
  { value: 'elixir', label: 'Elixir', icon: '💧', categories: ['all', 'backend'] },
  { value: 'erlang', label: 'Erlang', icon: 'E', categories: ['all'] },
  { value: 'fsharp', label: 'F#', icon: 'F#', categories: ['all'] },
  { value: 'ocaml', label: 'OCaml', icon: '🐫', categories: ['all'] },
  { value: 'dart', label: 'Dart', icon: '🎯', categories: ['all', 'mobile'] },
  { value: 'julia', label: 'Julia', icon: 'Ju', categories: ['all', 'data'] },
  { value: 'objectivec', label: 'Objective-C', icon: 'OC', categories: ['all', 'mobile'] },
  { value: 'coffeescript', label: 'CoffeeScript', icon: '☕', categories: ['all'] },
  { value: 'vb', label: 'Visual Basic', icon: 'VB', categories: ['all'] },
  { value: 'tcl', label: 'Tcl', icon: 'Tc', categories: ['all'] },
  // Database / SQL
  { value: 'sql', label: 'SQL', icon: '🗃️', categories: ['all', 'sql'] },
  { value: 'mysql', label: 'MySQL', icon: '🐬', categories: ['all', 'sql'] },
  { value: 'postgresql', label: 'PostgreSQL', icon: '🐘', categories: ['all', 'sql'] },
  // Frontend Frameworks
  { value: 'react', label: 'React', icon: '⚛️', categories: ['all', 'frontend', 'mobile'] },
  { value: 'vue', label: 'Vue', icon: 'V', categories: ['all', 'frontend'] },
  { value: 'angular', label: 'Angular', icon: 'A', categories: ['all', 'frontend'] },
  { value: 'svelte', label: 'Svelte', icon: 'S', categories: ['all', 'frontend'] },
  { value: 'nextjs', label: 'Next.js', icon: 'N', categories: ['all', 'frontend'] },
  { value: 'html', label: 'HTML', icon: '🌐', categories: ['all', 'frontend'] },
  // Backend Frameworks
  { value: 'nodejs', label: 'NodeJS', icon: '💚', categories: ['all', 'backend'] },
  { value: 'django', label: 'Django', icon: 'Dj', categories: ['all', 'backend'] },
  { value: 'rails', label: 'Rails', icon: '🛤️', categories: ['all', 'backend'] },
  { value: 'spring', label: 'Spring', icon: '🌱', categories: ['all', 'backend'] },
  // DevOps
  { value: 'terraform', label: 'Terraform', icon: '🏗️', categories: ['all', 'devops'] },
  { value: 'kubernetes', label: 'Kubernetes', icon: '☸️', categories: ['all', 'devops'] },
  { value: 'docker', label: 'Docker', icon: '🐳', categories: ['all', 'devops'] },
  // Data Science / ML
  { value: 'pyspark', label: 'PySpark', icon: '⚡', categories: ['all', 'data'] },
  { value: 'pytorch', label: 'PyTorch', icon: '🔥', categories: ['all', 'data'] },
  { value: 'tensorflow', label: 'TensorFlow', icon: 'TF', categories: ['all', 'data'] },
  { value: 'scipy', label: 'SciPy', icon: '📊', categories: ['all', 'data'] },
  // Blockchain
  { value: 'solidity', label: 'Solidity', icon: '⟠', categories: ['all'] },
  // Hardware
  { value: 'verilog', label: 'Verilog', icon: '🔌', categories: ['all'] },
  // Docs
  { value: 'markdown', label: 'Markdown', icon: 'MD', categories: ['all', 'docs'] },
];

const CATEGORIES = [
  { id: 'all', label: 'All', color: '#10b981' },
  { id: 'frontend', label: 'Frontend', color: '#3b82f6' },
  { id: 'backend', label: 'Backend', color: '#91C733' },
  { id: 'mobile', label: 'Mobile', color: '#ec4899' },
  { id: 'sql', label: 'SQL', color: '#f59e0b' },
  { id: 'devops', label: 'DevOps', color: '#06b6d4' },
  { id: 'data', label: 'Data/ML', color: '#84cc16' },
  { id: 'docs', label: 'Docs', color: '#64748b' },
];

export default function LanguageSelectorModal({ isOpen, onClose, selectedLanguage, onSelect }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Get languages for the selected category
  const getFilteredLanguages = () => {
    let langs = LANGUAGES;

    // Filter by category (categories is now an array)
    if (activeCategory !== 'all') {
      langs = langs.filter(l => l.categories.includes(activeCategory));
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      langs = langs.filter(l => l.label.toLowerCase().includes(query));
    }

    return langs;
  };

  const filteredLanguages = getFilteredLanguages();
  const activeCategoryData = CATEGORIES.find(c => c.id === activeCategory);

  const handleSelect = (value) => {
    onSelect(value);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 bg-[var(--bg-surface)] border border-[var(--border)]"
        style={{
          maxWidth: '800px',
          height: '560px',
          maxHeight: '85vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient Header Bar */}
        <div
          className="h-1.5"
          style={{ background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 50%, #91C733 100%)' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Select Language</h2>
            <p className="text-xs text-[var(--text-secondary)]">Choose your preferred programming language</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          >
            Close
          </button>
        </div>

        {/* Category Pills */}
        <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveCategory(cat.id);
              }}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={{
                background: activeCategory === cat.id ? cat.color : 'rgba(100, 116, 139, 0.2)',
                color: activeCategory === cat.id ? '#0c1322' : '#94a3b8',
                boxShadow: activeCategory === cat.id ? `0 2px 8px ${cat.color}40` : 'none',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type to search..."
            className="w-full px-4 py-2.5 text-sm rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-400/30 bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] placeholder-[var(--text-muted)]"
            autoFocus
          />
        </div>

        {/* Language Grid */}
        <div className="flex-1 overflow-y-auto p-5 bg-[var(--bg-surface)]" style={{ maxHeight: 'calc(100% - 220px)' }}>
          {/* Auto option */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelect('auto');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-4 transition-all hover:bg-[var(--bg-elevated)]"
            style={{
              background: selectedLanguage === 'auto'
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)'
                : 'rgba(30, 41, 59, 0.5)',
              border: selectedLanguage === 'auto' ? '2px solid #10b981' : '1px solid rgba(100, 116, 139, 0.3)',
            }}
          >
            <div
              className="w-10 h-10 flex items-center justify-center rounded-lg text-lg"
              style={{
                background: selectedLanguage === 'auto'
                  ? 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)'
                  : 'linear-gradient(135deg, #334155 0%, #475569 100%)',
              }}
            >
              ✨
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-semibold text-[var(--text-primary)]">Auto Detect</div>
              <div className="text-xs text-[var(--text-secondary)]">Let AI choose the best language</div>
            </div>
            {selectedLanguage === 'auto' && (
              <span className="text-lg font-bold text-brand-400">✓</span>
            )}
          </button>

          {/* Language grid */}
          <div className="grid grid-cols-4 gap-2">
            {filteredLanguages.map(lang => (
              <button
                key={lang.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(lang.value);
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-[var(--bg-elevated)] group"
                style={{
                  background: selectedLanguage === lang.value
                    ? `linear-gradient(135deg, ${activeCategoryData?.color || '#10b981'}15 0%, ${activeCategoryData?.color || '#10b981'}08 100%)`
                    : 'rgba(30, 41, 59, 0.5)',
                  border: selectedLanguage === lang.value
                    ? `2px solid ${activeCategoryData?.color || '#10b981'}`
                    : '1px solid rgba(100, 116, 139, 0.2)',
                }}
              >
                <span
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all group-hover:scale-105"
                  style={{
                    background: selectedLanguage === lang.value
                      ? activeCategoryData?.color || '#10b981'
                      : '#334155',
                    color: selectedLanguage === lang.value ? '#0c1322' : '#cbd5e1',
                  }}
                >
                  {lang.icon}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)] truncate flex-1">{lang.label}</span>
                {selectedLanguage === lang.value && (
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: activeCategoryData?.color || '#10b981' }}>✓</span>
                )}
              </button>
            ))}
          </div>

          {filteredLanguages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[var(--text-secondary)] font-medium">No languages found</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 flex items-center justify-between text-xs text-[var(--text-muted)] border-t border-[var(--border)] bg-[var(--bg-elevated)]">
          <span>Press ESC to close</span>
          <span>{filteredLanguages.length} languages available</span>
        </div>
      </div>
    </div>
  );
}
