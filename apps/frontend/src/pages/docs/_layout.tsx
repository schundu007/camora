import { ReactNode, useEffect } from 'react';
import SiteNav from '../../components/shared/SiteNav';
import SiteFooter from '../../components/shared/SiteFooter';
import SEO from '../../components/shared/SEO';
import DocsShell from '../../components/shared/docs/DocsShell';
import OnThisPage, { OnThisPageItem } from '../../components/shared/docs/OnThisPage';
import DocsBreadcrumbs from '../../components/shared/docs/DocsBreadcrumbs';

interface DocsPageLayoutProps {
  /** SEO title shown in browser tab + meta tags. */
  title: string;
  /** SEO meta description, also used as the subtitle under the H1. */
  description: string;
  /** URL path of the page (e.g. /docs/lumora-coding) for SEO canonical. */
  path: string;
  /** Eyebrow label above the page H1 (e.g. "USER GUIDE", "ADMIN RUNBOOK"). */
  eyebrow?: string;
  /** Extra breadcrumb segments after Docs ›. Last item is the current page. */
  breadcrumbs?: { label: string; to?: string }[];
  /** Right-rail "On this page" anchor list. */
  onThisPage: OnThisPageItem[];
  /** Page body — the actual content sections. */
  children: ReactNode;
}

/**
 * Shared layout for all /docs/* pages. Centralizes the SiteNav + DocsShell +
 * breadcrumb + on-this-page wiring so each individual page only owns its
 * content sections. Mirrors the visual style of the existing /docs/teams
 * page (NVIDIA Isaac ROS pattern: 3-column reading shell with sticky
 * right rail and admonition boxes).
 */
export default function DocsPageLayout({
  title,
  description,
  path,
  eyebrow = 'DOCUMENTATION',
  breadcrumbs = [],
  onThisPage,
  children,
}: DocsPageLayoutProps) {
  useEffect(() => { document.title = `${title} — Camora docs`; }, [title]);

  const fullCrumbs = [{ label: 'Docs', to: '/docs' }, ...breadcrumbs];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
      <SEO title={title} description={description} path={path} />
      <SiteNav variant="light" />

      <div style={{ paddingTop: 80 }}>
        <DocsShell
          breadcrumbs={<DocsBreadcrumbs items={fullCrumbs} />}
          onThisPage={<OnThisPage items={onThisPage} />}
        >
          <header className="mb-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--accent)' }}>{eyebrow}</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{title}</h1>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>{description}</p>
          </header>
          {children}
        </DocsShell>
      </div>

      <SiteFooter variant="light" />
    </div>
  );
}
