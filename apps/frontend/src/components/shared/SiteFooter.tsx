import { Link } from 'react-router-dom';
import CamoraLogo from './CamoraLogo';
import { NAV_LINKS } from '../../lib/constants';

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] px-4 sm:px-6 mt-auto" style={{ height: 48, width: '100%', background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,27,75,0.93) 50%, rgba(15,23,42,0.95) 100%)', fontFamily: "var(--font-sans)" }}>
      <div className="w-full lg:max-w-[70%] mx-auto h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CamoraLogo size={22} />
          <span className="text-xs font-extrabold text-white" style={{ fontFamily: "var(--font-sans)" }}>Camora</span>
        </div>
        <div className="flex items-center gap-4">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} to={link.href} className="text-[11px] text-white font-bold hover:text-white/70 transition-colors">{link.label}</Link>
          ))}
          <a href="mailto:support@cariara.com" className="text-[11px] text-white font-bold hover:text-white/70 transition-colors">Support</a>
        </div>
        <p className="text-[10px] font-bold text-white/80" style={{ fontFamily: "'Source Code Pro', monospace" }}>&copy; {new Date().getFullYear()} Cariara</p>
      </div>
    </footer>
  );
}
