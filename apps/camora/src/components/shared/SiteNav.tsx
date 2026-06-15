import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import CamoraLogo from './CamoraLogo';
import UserDropdown from './UserDropdown';
import { HourMeterChip } from './ui/HourMeterChip';
import Chip from '@/components/shared/ui/Chip';
import { cn } from '../../utils/cn';
import { NAV_LINKS } from '../../lib/constants';

const NAV_HEIGHT = 60;

/**
 * SiteNav — enterprise-grade chrome.
 *
 * Design notes:
 *   · The nav is always charcoal (#11141A) regardless of body theme so the
 *     header/footer pair reads as one consistent surface across the site.
 *   · A 1 px gold-leaf hairline separates nav from page (brand seam).
 *   · Active links use a soft lapis pill instead of full-bleed gold.
 *   · `variant` prop is preserved for back-compat but no longer drives colors.
 */
export default function SiteNav({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  void variant;
  const { isAuthenticated, logout, onboardingCompleted } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/' || location.pathname === '/landing';
  const { theme, toggle: toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  useEffect(() => {
    document.documentElement.style.setProperty('--nav-h', `${NAV_HEIGHT}px`);
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 inset-x-0 z-50 bg-[#11141A] text-white border-b border-[rgba(201,162,39,0.32)] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)]"
        aria-label="Primary"
      >
        <div className="mx-auto flex h-[60px] items-center px-4 sm:px-6 lg:px-8 max-w-7xl">
          <Link to="/" aria-label="Camora — home" className="flex items-center gap-2.5 flex-shrink-0">
            <CamoraLogo size={30} />
            <span className="hidden sm:inline-block font-display text-[17px] font-semibold tracking-tight text-white">
              Camora
            </span>
          </Link>

          {/* Back — visible on every non-landing page so the desktop Electron
              build (no browser chrome) and web users alike can return to
              the previous page without bouncing through "/". navigate(-1)
              with a "/" fallback for cold launches with no history. */}
          {!isLanding && (
            <button
              type="button"
              onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/'); }}
              className="hidden sm:flex items-center ml-3"
              title="Back"
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

          {/* Desktop links */}
          <div
            className="hidden md:flex items-center gap-0.5 ml-8"
            style={{
              padding: 3,
              border: '1px solid rgba(201,162,39,0.50)',
              borderRadius: 999,
              background: 'rgba(3,19,46,0.88)',
            }}
          >
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold font-mono uppercase tracking-wider transition-colors no-underline"
                  style={{
                    background: active ? 'var(--cam-gold-leaf)' : 'transparent',
                    color: active ? 'var(--cam-primary-dk)' : 'rgba(255,255,255,0.82)',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right cluster */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/85 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cam-gold-leaf)]"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            {isAuthenticated && <HourMeterChip variant="dark" />}

            {isAuthenticated ? (
              <UserDropdown variant="dark" />
            ) : (
              <>
                <Link
                  to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
                  className="px-3 py-1.5 text-[13px] font-semibold text-white/85 hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cam-gold-leaf)] px-4 py-1.5 text-[13px] font-bold text-[#11141A] shadow-[0_4px_14px_-4px_rgba(201,162,39,0.5)] hover:bg-[var(--cam-gold-leaf-lt)]"
                >
                  Start free
                </Link>
              </>
            )}
          </div>

          {/* Mobile burger */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="md:hidden ml-auto flex h-10 w-10 items-center justify-center rounded-md text-white"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/40 cursor-default"
              style={{ top: NAV_HEIGHT }}
            />
            <div
              className="md:hidden absolute right-0 z-50 w-[280px] max-w-[92vw] rounded-bl-2xl border border-t-0 border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl"
              style={{ top: NAV_HEIGHT }}
              role="menu"
            >
              <div className="px-4 py-3 max-h-[70vh] overflow-y-auto">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block py-2.5 text-[14px] font-semibold',
                      isActive(link.href)
                        ? 'text-[var(--cam-primary)]'
                        : 'text-[var(--text-primary)]',
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-2 pt-3 border-t border-[var(--border)] flex flex-col gap-1">
                  {isAuthenticated ? (
                    <>
                      <Link to="/account/team" onClick={() => setOpen(false)} className="flex items-center justify-between py-2.5 text-[14px] font-semibold text-[var(--text-primary)]">
                        <span>AI hours</span>
                        <HourMeterChip variant="light" />
                      </Link>
                      <Link to="/capra/prepare" onClick={() => setOpen(false)} className="block py-2.5 text-[14px] font-semibold text-[var(--text-primary)]">Dashboard</Link>
                      <Link to="/profile" onClick={() => setOpen(false)} className="block py-2.5 text-[14px] font-semibold text-[var(--text-primary)]">Profile</Link>
                      {onboardingCompleted === false && (
                        <Link to="/capra/onboarding" onClick={() => setOpen(false)} className="block py-2.5 text-[14px] font-semibold text-[var(--text-primary)]">Onboarding</Link>
                      )}
                      <Link to="/profile?tab=referrals" onClick={() => setOpen(false)} className="block py-2.5 text-[14px] font-semibold text-[var(--text-primary)]">Refer a Friend</Link>
                      <button type="button" onClick={() => { toggleTheme(); setOpen(false); }} className="block w-full text-left py-2.5 text-[14px] font-semibold text-[var(--text-primary)]">
                        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                      </button>
                      <button type="button" onClick={() => { logout(); setOpen(false); }} className="block w-full text-left py-2.5 text-[14px] font-semibold text-[var(--danger)]">Sign out</button>
                    </>
                  ) : (
                    <>
                      <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} onClick={() => setOpen(false)} className="block py-2.5 text-[14px] font-semibold text-[var(--text-primary)]">Sign in</Link>
                      <Link to="/signup" onClick={() => setOpen(false)} className="block py-2.5 text-[14px] font-semibold text-[var(--cam-primary)]">Start free</Link>
                      <button type="button" onClick={() => { toggleTheme(); setOpen(false); }} className="block w-full text-left py-2.5 text-[14px] font-semibold text-[var(--text-primary)]">
                        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

      </nav>
      <div style={{ height: NAV_HEIGHT }} aria-hidden="true" />
    </>
  );
}

const SunIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);
const MoonIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </svg>
);
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M3 5h14M3 10h14M3 15h14" />
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
);
