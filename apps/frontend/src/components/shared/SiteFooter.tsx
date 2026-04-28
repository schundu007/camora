import { Link } from 'react-router-dom';
import CamoraLogo from './CamoraLogo';
import { NAV_LINKS } from '../../lib/constants';

export default function SiteFooter({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  // Footer chrome matches SiteNav: neutral charcoal regardless of theme,
  // white-on-dark text, thin gold-leaf top edge as the brand seam. Same
  // LeetCode-style enterprise chrome on both ends of the page.
  void variant;
  const bg = '#1A1D24';
  const textPrimary = '#FFFFFF';
  const textMuted = 'rgba(255,255,255,0.62)';

  const linkOver = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = textPrimary; };
  const linkOut = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = textMuted; };

  return (
    <footer className="px-4 sm:px-6 mt-auto" style={{ height: 48, width: '100%', background: bg, borderTop: '1px solid rgba(201,162,39,0.35)', fontFamily: 'var(--font-sans)' }}>
      <div className="w-full lg:max-w-[70%] mx-auto h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CamoraLogo size={22} />
        </div>
        <div className="flex items-center gap-4">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} to={link.href} className="text-[11px] font-bold transition-colors" style={{ color: textMuted }} onMouseEnter={linkOver} onMouseLeave={linkOut}>{link.label}</Link>
          ))}
          <a href="mailto:support@cariara.com" className="text-[11px] font-bold transition-colors" style={{ color: textMuted }} onMouseEnter={linkOver} onMouseLeave={linkOut}>Support</a>
        </div>
        <p className="text-[10px] font-bold" style={{ fontFamily: "'Source Code Pro', monospace", color: textMuted }}>&copy; {new Date().getFullYear()} Cariara</p>
      </div>
    </footer>
  );
}
