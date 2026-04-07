import { Link } from 'react-router-dom';
import CamoraLogo from './CamoraLogo';

const NAV_LINKS = [
  { label: 'Apply', href: '/jobs' },
  { label: 'Prepare', href: '/capra/prepare' },
  { label: 'Practice', href: '/capra/practice' },
  { label: 'Attend', href: '/lumora' },
  { label: 'Pricing', href: '/pricing' },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#e3e8ee] px-6 py-10">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <CamoraLogo size={32} />
          <span className="text-sm font-bold text-gray-900" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} to={link.href} className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors">{link.label}</Link>
          ))}
          <a href="mailto:support@cariara.com" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors">Support</a>
        </div>
        <p className="text-[12px] font-mono text-gray-400">&copy; {new Date().getFullYear()} Camora by Cariara</p>
      </div>
    </footer>
  );
}
