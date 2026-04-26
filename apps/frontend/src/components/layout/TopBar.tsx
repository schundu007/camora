import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import UserDropdown from '../shared/UserDropdown';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import CamoraLogo from '../shared/CamoraLogo';
import CommandPalette from './CommandPalette';
import { NAV_LINKS } from '../../lib/constants';

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export default function TopBar({ onToggleSidebar, sidebarOpen }: TopBarProps) {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);
  const location = useLocation();
  const isNavActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

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
        className="flex items-center justify-between px-4 sm:px-6 shrink-0 z-50 no-scrollbar"
        style={{
          height: 60,
          // Lapis-tinted vertical gradient + soft inset highlight gives the
          // header weight and depth without leaving the navy palette.
          // Both stops resolve from design tokens so light/dark flip
          // cleanly. The boxShadow does double duty: a thin lapis hairline
          // along the bottom for separation, plus a wider soft glow that
          // implies the header floats above the page.
          background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)',
          borderBottom: '1px solid var(--border)',
          boxShadow:
            '0 1px 2px rgba(38,97,156,0.05), 0 4px 16px rgba(38,97,156,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          backdropFilter: 'saturate(120%) blur(6px)',
          WebkitBackdropFilter: 'saturate(120%) blur(6px)',
        }}
      >
        {/* -- Left: mobile hamburger + logo ---------------------- */}
        <div className="flex items-center gap-3">
          {/* Hamburger -- mobile only */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-md transition-colors"
            style={{ color: 'var(--text-primary)' }}
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
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <CamoraLogo size={32} />
          </Link>

          {/* Nav links — desktop only (hide Pricing & Challenge in app shell).
              Active link gets a lapis-tinted pill with a subtle inset
              shadow so it reads as "pressed" rather than just colored. */}
          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {NAV_LINKS.filter(l => l.href !== '/pricing' && l.href !== '/challenge').map((link) => {
              const active = isNavActive(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-3.5 py-1.5 text-[13px] rounded-lg transition-all no-underline"
                  style={{
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: active ? 700 : 600,
                    background: active ? 'var(--accent-subtle)' : 'transparent',
                    boxShadow: active ? 'inset 0 0 0 1px rgba(38,97,156,0.18)' : 'none',
                    letterSpacing: active ? '0.005em' : 'normal',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* -- Center: search bar --------------------------------- */}
        <div className="hidden sm:flex flex-1 justify-center px-6 lg:max-w-xs">
          <div
            className="flex items-center gap-2 w-full max-w-md px-3 h-8 rounded-full cursor-pointer transition-colors"
            style={{
              background: 'var(--bg-elevated)',
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
              style={{ color: 'var(--text-primary)', flexShrink: 0 }}
            >
              <circle cx="7" cy="7" r="5.5" />
              <path d="M11 11l3.5 3.5" />
            </svg>
            <span
              className="text-xs flex-1 truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              Search topics...
            </span>
            <kbd
              className="hidden lg:inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--bg-surface)',
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
            className="flex items-center justify-center w-10 h-10 min-h-[40px] rounded-md transition-colors"
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
            className="sm:hidden flex items-center justify-center w-10 h-10 min-h-[40px] rounded-md transition-colors"
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

          {/* Avatar — user dropdown menu */}
          <UserDropdown variant="light" />

        </div>
      </header>

      {/* Command palette modal */}
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
