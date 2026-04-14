import { useState, useEffect } from 'react';

// Devicon CDN base for original language logos
const D = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons';

// Language data with logo URLs from devicon CDN
const LANGUAGES = [
  // Core Languages
  { value: 'python3', label: 'Python 3', logo: `${D}/python/python-original.svg`, categories: ['all', 'data'] },
  { value: 'python2', label: 'Python 2', logo: `${D}/python/python-original.svg`, categories: ['all'] },
  { value: 'javascript', label: 'JavaScript', logo: `${D}/javascript/javascript-original.svg`, categories: ['all', 'frontend', 'backend'] },
  { value: 'typescript', label: 'TypeScript', logo: `${D}/typescript/typescript-original.svg`, categories: ['all', 'frontend', 'backend'] },
  { value: 'java', label: 'Java', logo: `${D}/java/java-original.svg`, categories: ['all', 'backend', 'mobile'] },
  { value: 'c', label: 'C', logo: `${D}/c/c-original.svg`, categories: ['all'] },
  { value: 'cpp', label: 'C++', logo: `${D}/cplusplus/cplusplus-original.svg`, categories: ['all'] },
  { value: 'csharp', label: 'C#', logo: `${D}/csharp/csharp-original.svg`, categories: ['all', 'backend'] },
  { value: 'go', label: 'Go', logo: `${D}/go/go-original-wordmark.svg`, categories: ['all', 'backend', 'devops'] },
  { value: 'rust', label: 'Rust', logo: `${D}/rust/rust-original.svg`, categories: ['all'] },
  { value: 'ruby', label: 'Ruby', logo: `${D}/ruby/ruby-original.svg`, categories: ['all', 'backend'] },
  { value: 'php', label: 'PHP', logo: `${D}/php/php-original.svg`, categories: ['all', 'backend'] },
  { value: 'swift', label: 'Swift 5', logo: `${D}/swift/swift-original.svg`, categories: ['all', 'mobile'] },
  { value: 'kotlin', label: 'Kotlin', logo: `${D}/kotlin/kotlin-original.svg`, categories: ['all', 'mobile'] },
  { value: 'scala', label: 'Scala', logo: `${D}/scala/scala-original.svg`, categories: ['all', 'backend'] },
  { value: 'bash', label: 'Bash', logo: `${D}/bash/bash-original.svg`, categories: ['all', 'devops'] },
  { value: 'perl', label: 'Perl', logo: `${D}/perl/perl-original.svg`, categories: ['all'] },
  { value: 'lua', label: 'Lua', logo: `${D}/lua/lua-original.svg`, categories: ['all'] },
  { value: 'r', label: 'R', logo: `${D}/r/r-original.svg`, categories: ['all', 'data'] },
  { value: 'haskell', label: 'Haskell', logo: `${D}/haskell/haskell-original.svg`, categories: ['all'] },
  { value: 'clojure', label: 'Clojure', logo: `${D}/clojure/clojure-original.svg`, categories: ['all'] },
  { value: 'elixir', label: 'Elixir', logo: `${D}/elixir/elixir-original.svg`, categories: ['all', 'backend'] },
  { value: 'erlang', label: 'Erlang', logo: `${D}/erlang/erlang-original.svg`, categories: ['all'] },
  { value: 'fsharp', label: 'F#', logo: `${D}/fsharp/fsharp-original.svg`, categories: ['all'] },
  { value: 'ocaml', label: 'OCaml', logo: `${D}/ocaml/ocaml-original.svg`, categories: ['all'] },
  { value: 'dart', label: 'Dart', logo: `${D}/dart/dart-original.svg`, categories: ['all', 'mobile'] },
  { value: 'julia', label: 'Julia', logo: `${D}/julia/julia-original.svg`, categories: ['all', 'data'] },
  { value: 'objectivec', label: 'Objective-C', logo: `${D}/objectivec/objectivec-plain.svg`, categories: ['all', 'mobile'] },
  { value: 'coffeescript', label: 'CoffeeScript', logo: `${D}/coffeescript/coffeescript-original.svg`, categories: ['all'] },
  { value: 'vb', label: 'Visual Basic', logo: `${D}/visualbasic/visualbasic-original.svg`, categories: ['all'] },
  { value: 'tcl', label: 'Tcl', icon: 'Tcl', categories: ['all'] },
  // Database / SQL
  { value: 'sql', label: 'SQL', logo: `${D}/azuresqldatabase/azuresqldatabase-original.svg`, categories: ['all', 'sql'] },
  { value: 'mysql', label: 'MySQL', logo: `${D}/mysql/mysql-original.svg`, categories: ['all', 'sql'] },
  { value: 'postgresql', label: 'PostgreSQL', logo: `${D}/postgresql/postgresql-original.svg`, categories: ['all', 'sql'] },
  // Frontend Frameworks
  { value: 'react', label: 'React', logo: `${D}/react/react-original.svg`, categories: ['all', 'frontend', 'mobile'] },
  { value: 'vue', label: 'Vue', logo: `${D}/vuejs/vuejs-original.svg`, categories: ['all', 'frontend'] },
  { value: 'angular', label: 'Angular', logo: `${D}/angular/angular-original.svg`, categories: ['all', 'frontend'] },
  { value: 'svelte', label: 'Svelte', logo: `${D}/svelte/svelte-original.svg`, categories: ['all', 'frontend'] },
  { value: 'nextjs', label: 'Next.js', logo: `${D}/nextjs/nextjs-original.svg`, categories: ['all', 'frontend'] },
  { value: 'html', label: 'HTML', logo: `${D}/html5/html5-original.svg`, categories: ['all', 'frontend'] },
  // Backend Frameworks
  { value: 'nodejs', label: 'NodeJS', logo: `${D}/nodejs/nodejs-original.svg`, categories: ['all', 'backend'] },
  { value: 'django', label: 'Django', logo: `${D}/django/django-plain.svg`, categories: ['all', 'backend'] },
  { value: 'rails', label: 'Rails', logo: `${D}/rails/rails-plain.svg`, categories: ['all', 'backend'] },
  { value: 'spring', label: 'Spring', logo: `${D}/spring/spring-original.svg`, categories: ['all', 'backend'] },
  // DevOps
  { value: 'terraform', label: 'Terraform', logo: `${D}/terraform/terraform-original.svg`, categories: ['all', 'devops'] },
  { value: 'kubernetes', label: 'Kubernetes', logo: `${D}/kubernetes/kubernetes-original.svg`, categories: ['all', 'devops'] },
  { value: 'docker', label: 'Docker', logo: `${D}/docker/docker-original.svg`, categories: ['all', 'devops'] },
  // Data Science / ML
  { value: 'pyspark', label: 'PySpark', logo: `${D}/apachespark/apachespark-original.svg`, categories: ['all', 'data'] },
  { value: 'pytorch', label: 'PyTorch', logo: `${D}/pytorch/pytorch-original.svg`, categories: ['all', 'data'] },
  { value: 'tensorflow', label: 'TensorFlow', logo: `${D}/tensorflow/tensorflow-original.svg`, categories: ['all', 'data'] },
  { value: 'scipy', label: 'SciPy', icon: 'SciPy', categories: ['all', 'data'] },
  // Blockchain
  { value: 'solidity', label: 'Solidity', logo: `${D}/solidity/solidity-original.svg`, categories: ['all'] },
  // Hardware
  { value: 'verilog', label: 'Verilog', icon: 'V', categories: ['all'] },
  // Docs
  { value: 'markdown', label: 'Markdown', logo: `${D}/markdown/markdown-original.svg`, categories: ['all', 'docs'] },
];

const CATEGORIES = [
  { id: 'all', label: 'All', color: '#10b981' },
  { id: 'frontend', label: 'Frontend', color: '#3b82f6' },
  { id: 'backend', label: 'Backend', color: '#8b5cf6' },
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
          style={{ background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%)' }}
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
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all group-hover:scale-105 overflow-hidden"
                  style={{
                    background: selectedLanguage === lang.value
                      ? activeCategoryData?.color || '#10b981'
                      : '#334155',
                    color: selectedLanguage === lang.value ? '#0c1322' : '#cbd5e1',
                  }}
                >
                  {lang.logo
                    ? <img src={lang.logo} alt="" className="w-5 h-5" loading="lazy" />
                    : lang.icon}
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
