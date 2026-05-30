import { useState } from 'react';
import LanguageSelectorModal from './LanguageSelectorModal';

// Language labels for display
const LANGUAGE_LABELS = {
  auto: 'Auto',
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
};

/**
 * Mode controls - shown in Problem panel header
 * Handles both Coding mode (language + detail level) and System Design mode
 */
export default function AscendModeSelector({
  ascendMode,
  // System Design props
  designDetailLevel,
  onDetailLevelChange,
  autoGenerateEraser,
  onAutoGenerateEraserChange,
  // Coding props
  codingLanguage,
  onLanguageChange,
  codingDetailLevel,
  onCodingDetailLevelChange,
}) {
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Coding mode controls
  if (ascendMode === 'coding') {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Language Selector */}
        <button
          type="button"
          onClick={() => setShowLanguageModal(true)}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all hover:scale-[1.02] min-h-[36px] touch:min-h-[40px]"
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: '1px solid var(--border)',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span>{LANGUAGE_LABELS[codingLanguage] || codingLanguage || 'Auto'}</span>
          <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Detail Level Toggle */}
        <div
          className="flex items-center rounded-lg p-0.5 border border-[var(--border)]"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <button
            type="button"
            onClick={() => onCodingDetailLevelChange('basic')}
            className="px-2 sm:px-3 py-1.5 text-xs font-semibold transition-all rounded-md min-h-[32px] touch:min-h-[36px]"
            style={{
              background: codingDetailLevel === 'basic' ? 'var(--cam-gold-leaf)' : 'transparent',
              color: codingDetailLevel === 'basic' ? '#020617' : 'var(--text-muted)',
            }}
            title="Basic solution with essential explanation"
          >
            Basic
          </button>
          <button
            type="button"
            onClick={() => onCodingDetailLevelChange('detailed')}
            className="px-2 sm:px-3 py-1.5 text-xs font-semibold transition-all rounded-md min-h-[32px] touch:min-h-[36px]"
            style={{
              background: codingDetailLevel === 'detailed' ? 'var(--cam-gold-leaf)' : 'transparent',
              color: codingDetailLevel === 'detailed' ? '#020617' : 'var(--text-muted)',
            }}
            title="Full solution with detailed explanations"
          >
            Full
          </button>
        </div>

        {/* Language Modal */}
        <LanguageSelectorModal
          isOpen={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
          selectedLanguage={codingLanguage || 'auto'}
          onSelect={(lang) => {
            if (onLanguageChange) onLanguageChange(lang);
            setShowLanguageModal(false);
          }}
        />
      </div>
    );
  }

  // System Design mode — controls removed per product decision:
  //   · Basic / Full toggle: collapsed to always-Full. The Basic mode
  //     produced shallow single-region designs that didn't reflect
  //     real interview answers; carrying the toggle just confused users
  //     into picking the inferior variant by default.
  //   · Auto Pro pill: removed because Eraser fresh-generation costs
  //     real API credits per click. The panel now reads pre-generated
  //     Eraser diagrams from the cache (POST /api/diagram/eraser/lookup)
  //     and falls back to free Graphviz when no Eraser cache row
  //     exists. No surface-level toggle is needed for that path.
  if (ascendMode === 'system-design') {
    return null;
  }

  // Other modes - no controls
  return null;
}
