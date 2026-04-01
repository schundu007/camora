import { useEffect, useRef } from 'react';

/**
 * Stable keyboard shortcuts using refs to avoid stale closures.
 *
 * SHORTCUTS:
 * - Ctrl+1 / Cmd+1: Solve problem
 * - Ctrl+2 / Cmd+2: Run code
 * - Ctrl+3 / Cmd+3: Copy code
 * - Escape: Clear/close
 * - Cmd+Enter: Solve (alternative)
 * - Cmd+Shift+Enter: Run (alternative)
 * - Cmd+C: Copy code
 * - Cmd+E: Toggle problem expand
 * - Cmd+Shift+A: Toggle Ascend
 *
 * WHY THIS WON'T BREAK:
 * 1. Uses refs to store latest callback values - no stale closures
 * 2. Event listener is attached ONCE on mount with empty deps []
 * 3. Handler reads from refs at execution time, always getting current values
 * 4. Uses capture phase (true) for highest priority
 * 5. Accepts both Ctrl and Cmd on Mac for number shortcuts
 */
export function useKeyboardShortcuts({
  onSolve,
  onRun,
  onClear,
  onCopyCode,
  onToggleProblem,
  onToggleAscend,
  isLoading = false,
  hasCode = false,
  disabled = false,
}) {
  // Store all values in a single ref - updated every render
  const stateRef = useRef({
    onSolve,
    onRun,
    onClear,
    onCopyCode,
    onToggleProblem,
    onToggleAscend,
    isLoading,
    hasCode,
    disabled,
  });

  // Update ref on every render (safe and cheap)
  stateRef.current = {
    onSolve,
    onRun,
    onClear,
    onCopyCode,
    onToggleProblem,
    onToggleAscend,
    isLoading,
    hasCode,
    disabled,
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Read current values from ref (never stale)
      const {
        disabled,
        isLoading,
        hasCode,
        onSolve,
        onRun,
        onClear,
        onCopyCode,
        onToggleProblem,
        onToggleAscend,
      } = stateRef.current;

      // Skip if shortcuts are disabled (modal open, etc.)
      if (disabled) return;

      const isMac = /mac/i.test(navigator.platform || '');
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      const ctrlKey = e.ctrlKey;

      // For number shortcuts, accept both Ctrl and Cmd on Mac
      const modifierForNumbers = isMac ? (e.metaKey || e.ctrlKey) : e.ctrlKey;

      // === CTRL/CMD + NUMBER SHORTCUTS (primary) ===

      // Ctrl+1 or Cmd+1: Solve
      if (e.key === '1' && modifierForNumbers && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoading && onSolve) {
          document.activeElement?.blur?.();
          onSolve();
        }
        return;
      }

      // Ctrl+2 or Cmd+2: Run
      if (e.key === '2' && modifierForNumbers && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoading && onRun) {
          onRun();
        }
        return;
      }

      // Ctrl+3 or Cmd+3: Copy
      if (e.key === '3' && modifierForNumbers && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        if (hasCode && onCopyCode) {
          onCopyCode();
        }
        return;
      }

      // === ESCAPE ===
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClear?.();
        return;
      }

      // === CMD/CTRL + KEY SHORTCUTS ===

      // Cmd+Enter: Solve
      if (e.key === 'Enter' && cmdKey && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoading && onSolve) {
          onSolve();
        }
        return;
      }

      // Cmd+Shift+Enter: Run
      if (e.key === 'Enter' && cmdKey && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoading && onRun) {
          onRun();
        }
        return;
      }

      // Cmd+Shift+A: Toggle Ascend
      if (e.key.toLowerCase() === 'a' && cmdKey && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        onToggleAscend?.();
        return;
      }

      // Cmd+C: Copy code (only if code exists, otherwise allow default copy)
      if (e.key.toLowerCase() === 'c' && cmdKey && !e.shiftKey && !e.altKey) {
        if (hasCode && onCopyCode) {
          e.preventDefault();
          e.stopPropagation();
          onCopyCode();
        }
        return;
      }

      // Cmd+E: Toggle problem expand
      if (e.key.toLowerCase() === 'e' && cmdKey && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        onToggleProblem?.();
        return;
      }
    };

    // Attach with capture phase for highest priority
    window.addEventListener('keydown', handleKeyDown, true);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []); // Empty deps = attach once, never re-attach
}

export default useKeyboardShortcuts;
