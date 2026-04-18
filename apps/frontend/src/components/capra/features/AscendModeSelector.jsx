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
            background: '#10b981',
            color: 'white',
            border: 'none',
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
              background: codingDetailLevel === 'basic' ? '#10b981' : 'transparent',
              color: codingDetailLevel === 'basic' ? '#ffffff' : 'var(--text-muted)',
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
              background: codingDetailLevel === 'detailed' ? '#10b981' : 'transparent',
              color: codingDetailLevel === 'detailed' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: codingDetailLevel === 'detailed' ? '0 2px 6px rgba(16, 185, 129, 0.4)' : 'none',
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
            onLanguageChange && onLanguageChange(lang);
            setShowLanguageModal(false);
          }}
        />
      </div>
    );
  }

  // System Design mode controls
  if (ascendMode === 'system-design') {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Design Detail Level - Pill Toggle */}
        <div
          className="flex items-center rounded-full p-0.5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <button
            type="button"
            onClick={() => onDetailLevelChange('basic')}
            className="px-3 py-1 text-xs font-semibold transition-all rounded-full"
            style={{
              background: designDetailLevel === 'basic' ? '#10b981' : 'transparent',
              color: designDetailLevel === 'basic' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: designDetailLevel === 'basic' ? '0 1px 3px rgba(16, 185, 129, 0.3)' : 'none',
            }}
            title="Single-region, minimal architecture"
          >
            Basic
          </button>
          <button
            type="button"
            onClick={() => onDetailLevelChange('full')}
            className="px-3 py-1 text-xs font-semibold transition-all rounded-full"
            style={{
              background: designDetailLevel === 'full' ? '#10b981' : 'transparent',
              color: designDetailLevel === 'full' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: designDetailLevel === 'full' ? '0 1px 3px rgba(16, 185, 129, 0.3)' : 'none',
            }}
            title="Multi-region, HA, detailed scalability"
          >
            Full
          </button>
        </div>

        {/* Auto Pro Diagram Toggle - Compact Pill */}
        <button
          type="button"
          onClick={() => onAutoGenerateEraserChange(!autoGenerateEraser)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
          style={{
            background: autoGenerateEraser ? '#2D8CFF' : 'transparent',
            color: autoGenerateEraser ? '#ffffff' : '#2D8CFF',
            border: '1px solid #2D8CFF',
          }}
          title={autoGenerateEraser ? 'Pro diagram will auto-generate (uses Eraser API credits)' : 'Pro diagram disabled - click Generate manually'}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Auto Pro
          {autoGenerateEraser && (
            <svg className="w-2.5 h-2.5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  // Other modes - no controls
  return null;
}
