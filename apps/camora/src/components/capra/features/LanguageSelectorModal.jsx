import { useState, useEffect } from 'react';

// Language data — pruned to ONLY languages the backend Dockerfile
// installs a runtime for, so every choice can actually compile/run.
//
// Backend runtimes (apps/ascend-backend/Dockerfile):
//   node:20 (JS) · typescript (npm) · python3 · gcc (C/C++) ·
//   golang · rustc/cargo · openjdk-17 (Java) · bash
//
// Icons use the devicon CDN (https://devicon.dev) — official,
// brand-accurate language SVGs served via jsdelivr. The render
// path below detects URL-style icons via .startsWith('http') and
// emits an <img> tag; legacy emoji/text icons fall through to text.
const DEVICON = (slug, variant = 'original') =>
  `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${slug}/${slug}-${variant}.svg`;

const LANGUAGES = [
  // Core Languages — every entry has a runtime on the backend
  { value: 'python3', label: 'Python 3', icon: DEVICON('python'), categories: ['all', 'data'] },
  { value: 'javascript', label: 'JavaScript', icon: DEVICON('javascript'), categories: ['all', 'frontend', 'backend'] },
  { value: 'typescript', label: 'TypeScript', icon: DEVICON('typescript'), categories: ['all', 'frontend', 'backend'] },
  { value: 'java', label: 'Java', icon: DEVICON('java'), categories: ['all', 'backend', 'mobile'] },
  { value: 'c', label: 'C', icon: DEVICON('c'), categories: ['all'] },
  { value: 'cpp', label: 'C++', icon: DEVICON('cplusplus'), categories: ['all'] },
  { value: 'go', label: 'Go', icon: DEVICON('go', 'original-wordmark'), categories: ['all', 'backend', 'devops'] },
  { value: 'rust', label: 'Rust', icon: DEVICON('rust', 'plain'), categories: ['all'] },
  { value: 'bash', label: 'Bash', icon: DEVICON('bash'), categories: ['all', 'devops'] },
  // Database / SQL
  { value: 'sql', label: 'SQL', icon: '🗃️', categories: ['all', 'sql'] },
  { value: 'mysql', label: 'MySQL', icon: DEVICON('mysql'), categories: ['all', 'sql'] },
  { value: 'postgresql', label: 'PostgreSQL', icon: DEVICON('postgresql'), categories: ['all', 'sql'] },
  // Frontend Frameworks
  { value: 'react', label: 'React', icon: DEVICON('react'), categories: ['all', 'frontend', 'mobile'] },
  { value: 'vue', label: 'Vue', icon: DEVICON('vuejs'), categories: ['all', 'frontend'] },
  { value: 'angular', label: 'Angular', icon: DEVICON('angularjs'), categories: ['all', 'frontend'] },
  { value: 'svelte', label: 'Svelte', icon: DEVICON('svelte'), categories: ['all', 'frontend'] },
  { value: 'nextjs', label: 'Next.js', icon: DEVICON('nextjs'), categories: ['all', 'frontend'] },
  { value: 'html', label: 'HTML', icon: DEVICON('html5'), categories: ['all', 'frontend'] },
  // Backend Frameworks
  { value: 'nodejs', label: 'NodeJS', icon: DEVICON('nodejs'), categories: ['all', 'backend'] },
  { value: 'django', label: 'Django', icon: DEVICON('django', 'plain'), categories: ['all', 'backend'] },
  { value: 'rails', label: 'Rails', icon: DEVICON('rails', 'plain'), categories: ['all', 'backend'] },
  { value: 'spring', label: 'Spring', icon: DEVICON('spring'), categories: ['all', 'backend'] },
  // DevOps
  { value: 'terraform', label: 'Terraform', icon: DEVICON('terraform', 'original'), categories: ['all', 'devops'] },
  { value: 'kubernetes', label: 'Kubernetes', icon: DEVICON('kubernetes', 'plain'), categories: ['all', 'devops'] },
  { value: 'docker', label: 'Docker', icon: DEVICON('docker'), categories: ['all', 'devops'] },
  // Data Science / ML
  { value: 'pyspark', label: 'PySpark', icon: DEVICON('apachespark'), categories: ['all', 'data'] },
  { value: 'pytorch', label: 'PyTorch', icon: DEVICON('pytorch'), categories: ['all', 'data'] },
  { value: 'tensorflow', label: 'TensorFlow', icon: DEVICON('tensorflow'), categories: ['all', 'data'] },
  { value: 'scipy', label: 'SciPy', icon: '📊', categories: ['all', 'data'] },
  // Blockchain
  { value: 'solidity', label: 'Solidity', icon: '⟠', categories: ['all'] },
  // Hardware
  { value: 'verilog', label: 'Verilog', icon: '🔌', categories: ['all'] },
  // Docs
  { value: 'markdown', label: 'Markdown', icon: 'MD', categories: ['all', 'docs'] },
];

const CATEGORIES = [
  { id: 'all', label: 'All', color: 'var(--accent)' },
  { id: 'frontend', label: 'Frontend', color: 'var(--accent)' },
  { id: 'backend', label: 'Backend', color: 'var(--accent)' },
  { id: 'mobile', label: 'Mobile', color: 'var(--text-muted)' },
  { id: 'sql', label: 'SQL', color: 'var(--text-muted)' },
  { id: 'devops', label: 'DevOps', color: 'var(--accent)' },
  { id: 'data', label: 'Data/ML', color: 'var(--accent)' },
  { id: 'docs', label: 'Docs', color: 'var(--text-muted)' },
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
          style={{ background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent) 50%, var(--accent) 100%)' }}
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
                background: activeCategory === cat.id ? cat.color : 'var(--bg-elevated)',
                color: activeCategory === cat.id ? '#FFFFFF' : 'var(--text-dimmed)',
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
                ? 'var(--accent-subtle)'
                : 'var(--bg-elevated)',
              border: selectedLanguage === 'auto' ? '2px solid var(--accent)' : '1px solid var(--border)',
            }}
          >
            <div
              className="w-10 h-10 flex items-center justify-center rounded-lg text-lg"
              style={{
                background: selectedLanguage === 'auto'
                  ? 'var(--accent)'
                  : 'var(--bg-elevated)',
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
                    ? 'var(--accent-subtle)'
                    : 'var(--bg-elevated)',
                  border: selectedLanguage === lang.value
                    ? `2px solid ${activeCategoryData?.color || 'var(--accent)'}`
                    : '1px solid var(--border)',
                }}
              >
                <span
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all group-hover:scale-105 flex-shrink-0"
                  style={{
                    background: selectedLanguage === lang.value
                      ? activeCategoryData?.color || 'var(--accent)'
                      : 'var(--bg-elevated)',
                    color: selectedLanguage === lang.value ? '#FFFFFF' : 'var(--text-dimmed)',
                  }}
                >
                  {typeof lang.icon === 'string' && lang.icon.startsWith('http') ? (
                    <img
                      src={lang.icon}
                      alt={lang.label}
                      width={20}
                      height={20}
                      style={{ objectFit: 'contain' }}
                      loading="lazy"
                    />
                  ) : (
                    lang.icon
                  )}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)] truncate flex-1">{lang.label}</span>
                {selectedLanguage === lang.value && (
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: activeCategoryData?.color || 'var(--accent)' }}>✓</span>
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
