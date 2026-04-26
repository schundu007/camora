import { Link } from 'react-router-dom';
import CamoraLogo from './CamoraLogo';
import { NAV_LINKS } from '../../lib/constants';

export default function SiteFooter({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  // Honor the user's global theme via CSS vars so the footer matches the body
  // surface; the `variant` prop is preserved for back-compat but inert.
  void variant;
  const bg = 'var(--bg-surface)';
  const textColor = 'var(--text-primary)';
  const textMuted = 'var(--text-secondary)';
  const borderColor = 'var(--border)';

  return (
    <footer className="px-4 sm:px-6 mt-auto" style={{ height: 48, width: '100%', background: bg, borderTop: `1px solid ${borderColor}`, fontFamily: "var(--font-sans)" }}>
      <div className="w-full lg:max-w-[70%] mx-auto h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CamoraLogo size={22} />
        </div>
        <div className="flex items-center gap-4">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} to={link.href} className="text-[11px] font-bold transition-colors hover:text-[var(--text-primary)]" style={{ color: textMuted }}>{link.label}</Link>
          ))}
          <a href="mailto:support@cariara.com" className="text-[11px] font-bold transition-colors hover:text-[var(--text-primary)]" style={{ color: textMuted }}>Support</a>
        </div>
        <p className="text-[10px] font-bold" style={{ fontFamily: "'Source Code Pro', monospace", color: textMuted }}>&copy; {new Date().getFullYear()} Cariara</p>
      </div>
    </footer>
  );
}
