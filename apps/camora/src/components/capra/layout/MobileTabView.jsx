import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * MobileTabView — Swipeable tabbed container for mobile layouts.
 *
 * Usage:
 *   <MobileTabView
 *     tabs={[
 *       { id: 'problem', label: 'Problem' },
 *       { id: 'code', label: 'Code' },
 *       { id: 'explain', label: 'Explain' },
 *     ]}
 *     activeTab={activeTab}
 *     onTabChange={setActiveTab}
 *   >
 *     {(activeId) => (
 *       <>
 *         {activeId === 'problem' && <ProblemInput ... />}
 *         {activeId === 'code' && <CodeDisplay ... />}
 *         {activeId === 'explain' && <ExplanationPanel ... />}
 *       </>
 *     )}
 *   </MobileTabView>
 */
export default function MobileTabView({ tabs, activeTab, onTabChange, children, className = '', loadingTabId }) {
  const [localActive, setLocalActive] = useState(tabs[0]?.id);
  const active = activeTab ?? localActive;
  const setActive = onTabChange ?? setLocalActive;

  // Swipe tracking
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    // Only trigger if horizontal swipe is dominant and long enough
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;

    const currentIndex = tabs.findIndex((t) => t.id === active);
    if (dx < 0 && currentIndex < tabs.length - 1) {
      setActive(tabs[currentIndex + 1].id);
    } else if (dx > 0 && currentIndex > 0) {
      setActive(tabs[currentIndex - 1].id);
    }
  }, [active, tabs, setActive]);

  // Active indicator offset
  const tabBarRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({});

  useEffect(() => {
    if (!tabBarRef.current) return;
    const activeBtn = tabBarRef.current.querySelector(`[data-tab-id="${active}"]`);
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [active, tabs]);

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {/* Tab bar */}
      <div
        ref={tabBarRef}
        className="relative flex items-stretch border-b border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-sm flex-shrink-0"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex-1 min-h-[48px] flex items-center justify-center py-3 text-xs font-semibold uppercase tracking-wider transition-colors duration-200
              ${active === tab.id ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] active:text-[var(--text-secondary)]'}`}
          >
            <span className="flex items-center justify-center gap-1.5">
              {tab.label}
              {loadingTabId === tab.id && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              )}
            </span>
          </button>
        ))}
        {/* Animated indicator line */}
        <div
          className="absolute bottom-0 h-0.5 bg-[var(--accent)] transition-all duration-250 ease-smooth rounded-full"
          style={indicatorStyle}
        />
      </div>

      {/* Tab content — explicit height ensures panes fill correctly on Android */}
      <div
        className="flex-1 min-h-0 overflow-hidden relative"
        style={{ flex: '1 1 0%' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute inset-0 overflow-hidden">
          {typeof children === 'function' ? children(active) : children}
        </div>
      </div>
    </div>
  );
}
