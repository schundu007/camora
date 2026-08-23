import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import UserDropdown from '../shared/UserDropdown';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import CamoraLogo from '../shared/CamoraLogo';
// Lazy: CommandPalette pulls in 4MB of topic data (codingTopics,
// systemDesignTopics, behavioralTopics). It's only opened on Cmd+K, so
// loading those eagerly inflates every page that mounts TopBar.
const CommandPalette = lazy(() => import('./CommandPalette'));
import Chip from '@/components/shared/ui/Chip';
import { NAV_LINKS } from '../../lib/constants';
import { caraRegistry } from '@/lib/cara-registry';

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export default function TopBar({ onToggleSidebar, sidebarOpen }: TopBarProps) {
  const { logout, isAuthenticated } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/' || location.pathname === '/landing';
  const isNavActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  // Close mobile dropdown on route change or Escape.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Reference unused props so TS/ESLint stays quiet — RootShell still
  // wires them up for back-compat, but the mobile hamburger now opens
  // a TopBar-owned dropdown instead of the Sidebar's mobile drawer.
  void onToggleSidebar; void sidebarOpen;

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
        className="flex items-center justify-between px-4 sm:px-6 shrink-0 z-50 no-scrollbar lumora-winctl-safe"
        style={{
          height: 60,
          background: 'var(--cam-hero-strip)',
          borderBottom: '3px solid var(--cam-gold-leaf)',
          boxShadow: '0 6px 22px rgba(0,0,0,0.45)',
          color: 'var(--cam-strip-heading)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* -- Left: logo (always visible — clickable to return to landing) -- */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 no-underline" aria-label="Camora — home">
            <CamoraLogo size={32} />
          </Link>

          {/* Back — every Capra page (Prepare / Practice / Apply / Resume /
              Plan / etc.) was missing this affordance, so the only way back
              from a topic to the previous list view was to either hit the
              Camora logo (lands on landing) or use the browser's back button
              (which doesn't exist in the Electron desktop build).
              navigate(-1) with a "/" fallback for cold launches. */}
          {!isLanding && (
            <button
              type="button"
              onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/'); }}
              className="hidden sm:flex items-center"
              data-tip="Back"
              aria-label="Back"
            >
              <Chip variant="default" className="gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span>Back</span>
              </Chip>
            </button>
          )}

          {/* Nav links — desktop only (hide Pricing in app shell). */}
          <nav
            className="hidden lg:flex items-center gap-0.5 ml-4"
            style={{
              padding: 3,
              border: '1px solid var(--cam-strip-icon-border)',
              borderRadius: 999,
              background: 'var(--cam-strip-icon-bg)',
            }}
          >
            {NAV_LINKS.filter(l => l.href !== '/pricing').map((link) => {
              const active = isNavActive(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-3 py-1.5 text-[12px] font-bold font-mono uppercase tracking-wider rounded-full transition-[background-color,color] duration-150 active:scale-[0.98] no-underline"
                  style={{
                    color: active ? 'var(--cam-chip-active-text)' : 'var(--cam-strip-text)',
                    background: active ? 'var(--cam-chip-active-bg)' : 'transparent',
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
              className="hidden lg:inline-flex items-center gap-0.5 text-[12px] px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span className="text-[12px]">&#8984;</span>K
            </kbd>
          </div>
        </div>

        {/* -- Right: theme toggle + avatar + sign out ------------ */}
        <div className="flex items-center gap-2">
          {/* Cara + Playground — desktop */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => caraRegistry.open()}
              aria-label="Ask Cara (⌘K)"
              data-tip="Ask Cara (⌘K)"
              className="hidden sm:block"
            >
              <Chip variant="gold" className="gap-1.5 cursor-pointer">
                <span>✦</span>
                <span>Cara</span>
              </Chip>
            </button>
          )}
          {isAuthenticated && (
            <Link to="/playground" className="hidden sm:block no-underline" aria-label="Playground">
              <Chip variant="gold" className="gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
                Playground
              </Chip>
            </Link>
          )}
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 min-h-[40px] transition-[background-color,transform] duration-150 active:scale-[0.98]"
            style={{
              color: 'var(--cam-strip-heading)',
              border: '1px solid var(--cam-strip-icon-border)',
              borderRadius: 999,
              background: 'var(--cam-strip-icon-bg)',
            }}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            data-tip={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              /* Sun icon */
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              /* Moon icon */
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
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
          <UserDropdown variant={theme === 'dark' ? 'dark' : 'light'} />

          {/* Mobile hamburger — pinned right, matches SiteNav and Lumora.
              Opens a dropdown directly below the TopBar with NAV_LINKS
              and account utilities. */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-md transition-colors"
            style={{ color: 'var(--cam-strip-heading)' }}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4l10 10M14 4L4 14" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 4h14M2 9h14M2 14h14" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile dropdown — drops down under the TopBar from the right
          hamburger. Same pattern as SiteNav and Lumora. */}
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="md:hidden fixed inset-0 z-40 cursor-default"
            style={{ background: 'rgba(0,0,0,0.35)', top: 60 }}
          />
          <div
            className="md:hidden fixed right-0 z-50 w-[260px] max-w-[90vw]"
            style={{
              top: 60,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderTop: 'none',
              borderBottomLeftRadius: 12,
              boxShadow: '0 12px 28px rgba(0,0,0,0.20)',
            }}
            role="menu"
            aria-label="Navigation menu"
          >
            <div className="px-4 py-3 space-y-0.5 max-h-[70vh] overflow-y-auto">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-2.5 text-[14px] font-semibold"
                  style={{ color: isNavActive(link.href) ? 'var(--accent)' : 'var(--text-primary)' }}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => { caraRegistry.open(); setMenuOpen(false); }}
                    className="block w-full text-left py-2.5 text-[14px] font-bold"
                    style={{ color: 'var(--cam-gold-leaf, var(--cam-gold-leaf))' }}
                  >
                    ✦ Cara
                  </button>
                )}
                {isAuthenticated && (
                  <Link to="/playground" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 py-2.5 text-[14px] font-bold no-underline" style={{ color: 'var(--cam-gold-leaf, var(--cam-gold-leaf))' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                    Playground
                  </Link>
                )}
                {isAuthenticated && (
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="block py-2.5 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Profile</Link>
                )}
                <button type="button" onClick={() => { toggleTheme(); setMenuOpen(false); }} className="block w-full text-left py-2.5 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                {isAuthenticated ? (
                  <button type="button" onClick={() => { logout(); setMenuOpen(false); }} className="block w-full text-left py-2.5 text-[14px] font-semibold" style={{ color: 'var(--danger)' }}>Sign out</button>
                ) : (
                  <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} onClick={() => setMenuOpen(false)} className="block py-2.5 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Sign in</Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Command palette modal — only mount the lazy chunk once user opens it */}
      {cmdOpen && (
        <Suspense fallback={null}>
          <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
