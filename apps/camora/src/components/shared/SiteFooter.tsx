import { Link } from 'react-router-dom';
import CamoraLogo from './CamoraLogo';

export default function SiteFooter({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  void variant;
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-auto border-t"
      style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', borderTopColor: 'var(--border)' }}
    >
      {/* Main row */}
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Brand + social */}
        <div className="flex items-center gap-4">
          <Link to="/" className="inline-flex items-center gap-2" aria-label="Camora — home">
            <CamoraLogo size={28} />
            <span className="font-display text-[16px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Camora</span>
          </Link>
          <div className="flex items-center gap-1.5">
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

        {/* Flat link row */}
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link to="/docs" className="footer-link text-[13px] font-medium transition-colors" style={{ color: 'var(--text-secondary)' }}>Docs</Link>
          <Link to="/download" className="footer-link text-[13px] font-medium transition-colors" style={{ color: 'var(--text-secondary)' }}>Download</Link>
          <a href="https://jobs.cariara.com" target="_blank" rel="noopener noreferrer" className="footer-link text-[13px] font-medium transition-colors" style={{ color: 'var(--text-secondary)' }}>Jobs</a>
        </nav>
      </div>

      {/* Legal strip */}
      <div className="border-t" style={{ borderTopColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-7xl flex-col-reverse items-center justify-between gap-3 px-5 py-4 sm:px-6 lg:px-8 md:flex-row">
          <p className="font-mono text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            &copy; {year} Cariara, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            <Link to="/legal/terms" className="footer-link transition-colors" style={{ color: 'var(--text-secondary)' }}>Terms</Link>
            <Link to="/legal/privacy" className="footer-link transition-colors" style={{ color: 'var(--text-secondary)' }}>Privacy</Link>
            <Link to="/legal/security" className="footer-link transition-colors" style={{ color: 'var(--text-secondary)' }}>Security</Link>
            <a href="mailto:support@cariara.com" className="footer-link transition-colors" style={{ color: 'var(--text-secondary)' }}>Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  const isExternal = href.startsWith('http');
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      aria-label={label}
      className="footer-social inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </a>
  );
}
