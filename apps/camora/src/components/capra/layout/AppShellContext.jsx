import { createContext, useContext } from 'react';

export const AppShellContext = createContext(null);

/**
 * Hook to access the unified sidebar state from any component.
 * Returns a no-op stub when called outside AppShell.
 */
export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    return {
      sidebarOpen: false,
      openSidebar: () => {},
      closeSidebar: () => {},
      toggleSidebar: () => {},
      activeSection: null,
      setActiveSection: () => {},
      collapsed: false,
      toggleCollapsed: () => {},
    };
  }
  return ctx;
}
