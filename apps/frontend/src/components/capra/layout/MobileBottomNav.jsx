/**
 * MobileBottomNav - Fixed bottom navigation bar for mobile viewports.
 * Provides mode switching + assistant + settings access.
 */
export default function MobileBottomNav({
  ascendMode,
  onModeChange,
  showAscendAssistant,
  onAssistantClick,
  onSettingsClick,
}) {
  const items = [
    { id: 'coding', label: 'Code', icon: CodeIcon },
    { id: 'system-design', label: 'Design', icon: DesignIcon },
    { id: 'behavioral', label: 'Prep', icon: PrepIcon },
    { id: '_assistant', label: 'Assistant', icon: AssistantIcon, active: showAscendAssistant },
    { id: '_settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleTap = (id) => {
    if (id === '_assistant') return onAssistantClick();
    if (id === '_settings') return onSettingsClick();
    onModeChange(id);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-fixed flex items-stretch justify-around bg-white/95 border-t border-gray-200 backdrop-blur-md safe-bottom"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}
    >
      {items.map(({ id, label, icon: Icon, active }) => {
        const isActive = id.startsWith('_') ? active : ascendMode === id;
        return (
          <button
            key={id}
            onClick={() => handleTap(id)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[52px] pt-2 pb-1 text-xs font-medium transition-colors duration-150
              ${isActive ? 'text-emerald-600' : 'text-gray-400 active:text-gray-600'}`}
          >
            <Icon active={isActive} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// --- Icons (24x24, stroke-based) ---

function CodeIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

function DesignIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function PrepIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function AssistantIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function SettingsIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
