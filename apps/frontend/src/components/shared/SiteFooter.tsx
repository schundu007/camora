import { Link } from 'react-router-dom';
import CamoraLogo from './CamoraLogo';

/**
 * SiteFooter — multi-column enterprise footer.
 *
 * Mirrors the SiteNav chrome: charcoal substrate, gold-leaf hairline at
 * the top edge, white-on-dark text. Five columns of structured links
 * + brand summary on the left, legal strip pinned to the bottom.
 */
export default function SiteFooter({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  void variant;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-[#11141A] text-white border-t border-[rgba(201,162,39,0.32)]">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4">
            <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Camora — home">
              <CamoraLogo size={32} />
              <span className="font-display text-[18px] font-semibold tracking-tight">Camora</span>
            </Link>
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-white/65">
              The career platform for engineers. Apply, prepare, practice and attend — with live AI in the room when it counts.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <SocialIcon href="https://www.linkedin.com/company/cariara" label="LinkedIn">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 1 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </SocialIcon>
              <SocialIcon href="https://github.com/cariara" label="GitHub">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </SocialIcon>
              <SocialIcon href="mailto:hello@cariara.com" label="Email">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </SocialIcon>
            </div>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading} className="md:col-span-2">
              <h3 className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/55">{col.heading}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a
                        href={l.href}
                        className="text-[13px] font-medium text-white/72 hover:text-white transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link to={l.href} className="text-[13px] font-medium text-white/72 hover:text-white transition-colors">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Legal strip */}
      <div className="border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col-reverse items-center justify-between gap-3 px-5 py-5 sm:px-6 lg:px-8 md:flex-row">
          <p className="font-mono text-[11px] text-white/55">
            &copy; {year} Cariara, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-[12px] text-white/65">
            <Link to="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/legal/security" className="hover:text-white transition-colors">Security</Link>
            <a href="mailto:support@cariara.com" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

type FooterLink = { label: string; href: string; external?: boolean };
type FooterColumn = { heading: string; links: FooterLink[] };

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Apply', href: '/jobs' },
      { label: 'Prepare', href: '/capra/prepare' },
      { label: 'Practice', href: '/capra/practice' },
      { label: 'Attend', href: '/lumora' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Docs', href: '/docs' },
      { label: 'Brand', href: '/brand' },
      { label: 'Challenge', href: '/challenge' },
      { label: 'Download', href: '/download' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: 'https://jobs.cariara.com', external: true },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: 'mailto:hello@cariara.com', external: true },
    ],
  },
];

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  const isExternal = href.startsWith('http');
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </a>
  );
}
