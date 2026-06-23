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
import { caraRegistry } from '@/lib/cara-registry';

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
        className="fixed top-0 inset-x-0 z-50"
        style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
        aria-label="Primary"
      >
        <div className="mx-auto flex h-[60px] items-center px-4 sm:px-6 lg:px-8 max-w-7xl">
          <Link to="/" aria-label="Camora — home" className="flex items-center gap-2.5 flex-shrink-0">
            <CamoraLogo size={30} />
            <span className="hidden sm:inline-block font-display text-[17px] font-semibold tracking-tight" style={{ color: 'var(--cam-strip-heading)' }}>
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
          <div className="hidden md:flex items-center ml-6">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  className="flex items-center px-3 text-[13px] font-semibold transition-colors no-underline"
                  style={{
                    height: 60,
                    color: active ? 'var(--cam-strip-heading)' : 'color-mix(in oklab, var(--cam-strip-heading) 65%, transparent)',
                    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right cluster */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => caraRegistry.open()}
                aria-label="Ask Cara (⌘K)"
                title="Ask Cara (⌘K)"
              >
                <Chip variant="gold" className={`gap-1.5 cursor-pointer${theme === 'light' ? ' !bg-white !text-[#0047AB] !border-[#0047AB]/40' : ''}`}>
                  <span>✦</span>
                  <span>Cara</span>
                </Chip>
              </button>
            )}
            {isAuthenticated && (
              <Link to="/playground" className="no-underline" aria-label="Playground">
                <Chip variant="gold" className={`gap-1.5${theme === 'light' ? ' !bg-white !text-[#0047AB] !border-[#0047AB]/40' : ''}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                  Playground
                </Chip>
              </Link>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{ border: '1px solid var(--cam-gold-leaf)', background: 'rgba(0,0,0,0.08)', color: 'var(--cam-strip-heading)' }}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            {isAuthenticated && <HourMeterChip variant={theme === 'dark' ? 'dark' : 'light'} />}

            {isAuthenticated ? (
              <UserDropdown variant={theme === 'dark' ? 'dark' : 'light'} />
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#3683DC] px-4 py-1.5 text-[13px] font-bold text-white hover:bg-[#2265BF] transition-colors"
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
            className="md:hidden ml-auto flex h-10 w-10 items-center justify-center rounded-md"
            style={{ color: 'var(--cam-strip-heading)' }}
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
                  {isAuthenticated && (
                    <Link
                      to="/playground"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 py-2.5 text-[14px] font-bold no-underline"
                      style={{ color: 'var(--cam-gold-leaf, #D4A043)' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="4 17 10 11 4 5" />
                        <line x1="12" y1="19" x2="20" y2="19" />
                      </svg>
                      Playground
                    </Link>
                  )}
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
