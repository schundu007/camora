import { Link } from 'react-router-dom';
import CamoraLogo from './CamoraLogo';

const NAV_LINKS = [
  { label: 'Apply', href: '/jobs' },
  { label: 'Prepare', href: '/capra/prepare' },
  { label: 'Practice', href: '/capra/practice' },
  { label: 'Attend', href: '/lumora' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Challenge', href: '/challenge' },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#e3e8ee] px-4 sm:px-6 py-4 sm:py-0" style={{ minHeight: '80px', width: '100%' }}>
      <div className="w-full lg:max-w-[70%] mx-auto h-full flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CamoraLogo size={28} />
          <span className="text-sm font-bold text-gray-900" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} to={link.href} className="text-[12px] text-gray-500 hover:text-gray-900 transition-colors py-1 px-1">{link.label}</Link>
          ))}
          <a href="mailto:support@cariara.com" className="text-[12px] text-gray-500 hover:text-gray-900 transition-colors">Support</a>
        </div>
        <p className="text-[11px] font-mono text-gray-400">&copy; {new Date().getFullYear()} Cariara</p>
      </div>
    </footer>
  );
}
