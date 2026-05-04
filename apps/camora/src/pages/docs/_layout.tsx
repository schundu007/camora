import { ReactNode, useEffect } from 'react';
import SiteNav from '../../components/shared/SiteNav';
import SiteFooter from '../../components/shared/SiteFooter';
import SEO from '../../components/shared/SEO';
import OnThisPage, { OnThisPageItem } from '../../components/shared/docs/OnThisPage';
import DocsBreadcrumbs from '../../components/shared/docs/DocsBreadcrumbs';
import DocsSidebar, { DocsSidebarMobile } from '../../components/shared/docs/DocsSidebar';

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
  /** When true, suppresses the default page header so the page can render its own hero. */
  hideHeader?: boolean;
}

/**
 * Shared layout for all /docs/* pages. NVIDIA-DCGM-style:
 *   [ SiteNav ]
 *   [ left sidebar (User/Admin sections) | content (breadcrumbs + body) | "On this page" rail ]
 *   [ SiteFooter ]
 */
export default function DocsPageLayout({
  title,
  description,
  path,
  eyebrow = 'DOCUMENTATION',
  breadcrumbs = [],
  onThisPage,
  children,
  hideHeader = false,
}: DocsPageLayoutProps) {
  useEffect(() => { document.title = `${title} — Camora docs`; }, [title]);

  const fullCrumbs = [{ label: 'Docs', to: '/docs' }, ...breadcrumbs];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
      <SEO title={title} description={description} path={path} />
      <SiteNav variant="light" />

      <div style={{ paddingTop: 80 }} className="flex-1">
        <div className="w-full mx-auto px-6 lg:px-10" style={{ maxWidth: 1440 }}>
          <div className="flex gap-8">
            <aside
              className="hidden lg:block flex-shrink-0 py-8"
              style={{ width: 240, borderRight: '1px solid var(--border)' }}
              aria-label="Docs navigation"
            >
              <div className="sticky top-6 pr-4">
                <DocsSidebar />
              </div>
            </aside>

            <div className="flex-1 min-w-0 flex gap-10">
              <main className="flex-1 min-w-0 py-8" style={{ maxWidth: 860 }}>
                <DocsSidebarMobile />
                <div className="mb-4">
                  <DocsBreadcrumbs items={fullCrumbs} />
                </div>
                {!hideHeader && (
                  <header className="mb-10 relative pl-4" style={{ borderLeft: '3px solid #C9A227' }}>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] mb-2" style={{ color: '#C9A227' }}>{eyebrow}</p>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3" style={{ color: '#26619C' }}>{title}</h1>
                    <p className="text-base leading-[1.65]" style={{ color: 'var(--text-primary)' }}>{description}</p>
                  </header>
                )}
                {children}
              </main>

              <aside
                className="hidden xl:block flex-shrink-0 py-8"
                style={{ width: 200 }}
                aria-label="On this page"
              >
                <div className="sticky top-6">
                  <OnThisPage items={onThisPage} />
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter variant="light" />
    </div>
  );
}
