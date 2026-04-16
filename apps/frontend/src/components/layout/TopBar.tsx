import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import CamoraLogo from '../shared/CamoraLogo';
import CommandPalette from './CommandPalette';

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export default function TopBar({ onToggleSidebar, sidebarOpen }: TopBarProps) {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  // Global Cmd+K / Ctrl+K listener
  const handleGlobalKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    },
    [],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  return (
    <>
      <header
        className="flex items-center justify-between px-4 shrink-0 z-40"
        style={{
          height: 'var(--topbar-height, 48px)',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* -- Left: mobile hamburger + logo ---------------------- */}
        <div className="flex items-center gap-3">
          {/* Hamburger -- mobile only */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-md transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4l10 10M14 4L4 14" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 4h14M2 9h14M2 14h14" />
              </svg>
            )}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 no-underline">
            <CamoraLogo size={24} />
            <span
              className="text-sm font-bold tracking-wide hidden sm:inline"
              style={{
                fontFamily: 'var(--font-brand)',
                color: 'var(--text-primary)',
              }}
            >
              Camora
            </span>
          </Link>
        </div>

        {/* -- Center: search bar --------------------------------- */}
        <div className="hidden sm:flex flex-1 justify-center px-6">
          <div
            className="flex items-center gap-2 w-full max-w-md px-3 h-8 rounded-full cursor-pointer transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
            }}
            role="button"
            tabIndex={0}
            aria-label="Search topics"
            onClick={() => setCmdOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setCmdOpen(true);
              }
            }}
          >
            {/* Search icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ color: 'var(--text-muted)', flexShrink: 0 }}
            >
              <circle cx="7" cy="7" r="5.5" />
              <path d="M11 11l3.5 3.5" />
            </svg>
            <span
              className="text-xs flex-1 truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              Search topics...
            </span>
            <kbd
              className="hidden lg:inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span className="text-[11px]">&#8984;</span>K
            </kbd>
          </div>
        </div>

        {/* -- Right: theme toggle + avatar + sign out ------------ */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              /* Sun icon */
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8" cy="8" r="3" />
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
              </svg>
            ) : (
              /* Moon icon */
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 8.5A6.5 6.5 0 017.5 2 6 6 0 1014 8.5z" />
              </svg>
            )}
          </button>

          {/* Mobile search button */}
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="sm:hidden flex items-center justify-center w-7 h-7 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Search"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="7" cy="7" r="5.5" />
              <path d="M11 11l3.5 3.5" />
            </svg>
          </button>

          {/* Avatar — links to onboarding/profile */}
          <Link
            to="/capra/onboarding"
            className="flex items-center gap-2 no-underline rounded-md px-1.5 py-1 transition-colors hover:bg-[var(--bg-elevated)]"
            title="Update role & resume"
          >
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || 'User'}
                className="w-7 h-7 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                style={{
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                }}
              >
                {initials}
              </div>
            )}
            <span
              className="hidden md:inline text-xs font-medium truncate max-w-[120px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {user?.name}
            </span>
          </Link>

          {/* Sign out */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Sign out"
            title="Sign out"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" />
              <path d="M10 11l3-3-3-3" />
              <path d="M13 8H6" />
            </svg>
          </button>
        </div>
      </header>

      {/* Command palette modal */}
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
