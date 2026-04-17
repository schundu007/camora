import { Link } from 'react-router-dom';
import CamoraLogo from './CamoraLogo';
import { NAV_LINKS } from '../../lib/constants';

export default function SiteFooter({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  const isLight = variant === 'light';
  const bg = isLight
    ? '#FFFFFF'
    : 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,27,75,0.93) 50%, rgba(15,23,42,0.95) 100%)';
  const textColor = isLight ? '#0F172A' : '#FFFFFF';
  const textMuted = isLight ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.8)';
  const borderColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';

  return (
    <footer className="px-4 sm:px-6 mt-auto" style={{ height: 48, width: '100%', background: bg, borderTop: `1px solid ${borderColor}`, fontFamily: "var(--font-sans)" }}>
      <div className="w-full lg:max-w-[70%] mx-auto h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CamoraLogo size={22} />
          <span className="text-xs font-bold" style={{ fontFamily: "'Clash Display', sans-serif", background: 'linear-gradient(135deg, #76B900, #2d8a1e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Camora</span>
        </div>
        <div className="flex items-center gap-4">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} to={link.href} className="text-[11px] font-bold transition-colors" style={{ color: textMuted }}>{link.label}</Link>
          ))}
          <a href="mailto:support@cariara.com" className="text-[11px] font-bold transition-colors" style={{ color: textMuted }}>Support</a>
        </div>
        <p className="text-[10px] font-bold" style={{ fontFamily: "'Source Code Pro', monospace", color: textMuted }}>&copy; {new Date().getFullYear()} Cariara</p>
      </div>
    </footer>
  );
}
