import { Link } from 'react-router-dom';
import CamoraLogo from './CamoraLogo';
import { NAV_LINKS } from '../../lib/constants';

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#e3e8ee] px-4 sm:px-6 mt-auto" style={{ height: 48, width: '100%' }}>
      <div className="w-full lg:max-w-[70%] mx-auto h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CamoraLogo size={22} />
          <span className="text-xs font-bold text-gray-900" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
        </div>
        <div className="flex items-center gap-4">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} to={link.href} className="text-[11px] text-gray-500 hover:text-gray-900 transition-colors">{link.label}</Link>
          ))}
          <a href="mailto:support@cariara.com" className="text-[11px] text-gray-500 hover:text-gray-900 transition-colors">Support</a>
        </div>
        <p className="text-[10px] font-mono text-gray-400">&copy; {new Date().getFullYear()} Cariara</p>
      </div>
    </footer>
  );
}
