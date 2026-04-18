export default function KeyboardShortcutsModal({ onClose }) {
  const shortcuts = [
    { category: 'General', items: [
      { keys: ['Ctrl', '1'], description: 'Solve problem' },
      { keys: ['Ctrl', '2'], description: 'Run code' },
      { keys: ['Ctrl', '3'], description: 'Copy code' },
      { keys: ['Esc'], description: 'Close modals / panels' },
    ]},
    { category: 'Editor', items: [
      { keys: ['Ctrl', 'S'], description: 'Save (no-op, auto-saved)' },
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Ctrl', '/'], description: 'Toggle comment' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate line' },
    ]},
    { category: 'Navigation', items: [
      { keys: ['Ctrl', 'G'], description: 'Go to line' },
      { keys: ['Ctrl', 'F'], description: 'Find' },
      { keys: ['Ctrl', 'H'], description: 'Find and replace' },
    ]},
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="rounded-lg w-full max-w-[420px] mx-4 max-h-[80vh] overflow-hidden shadow-xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Keyboard Shortcuts</span>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-muted)' }}
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 52px)' }}>
          {shortcuts.map((section) => (
            <div key={section.category}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#F97316' }}>
                {section.category}
              </p>
              <div className="space-y-1.5">
                {section.items.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-2 rounded bg-[var(--bg-elevated)]"
                  >
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, kidx) => (
                        <span key={kidx}>
                          <kbd
                            className="px-1.5 py-0.5 text-xs font-mono rounded"
                            style={{
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border)',
                              boxShadow: '0 1px 0 var(--border)'
                            }}
                          >
                            {key}
                          </kbd>
                          {kidx < shortcut.keys.length - 1 && (
                            <span className="mx-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Tip */}
          <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <p className="text-xs" style={{ color: '#F97316' }}>
              <strong>Tip:</strong> On Mac, use <kbd className="px-1 py-0.5 text-xs font-mono rounded" style={{ background: '#3d3d3d', color: '#ffffff' }}>Cmd</kbd> instead of <kbd className="px-1 py-0.5 text-xs font-mono rounded" style={{ background: '#3d3d3d', color: '#ffffff' }}>Ctrl</kbd>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
