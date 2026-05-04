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
                  /*
                   * Doc page hero pattern: navy strip + gold-leaf border + glassy pill capsule.
                   *   • Navy strip   — vertical bar on the left edge in --cam-primary, marks
                   *                    every doc page with the brand colour.
                   *   • Gold leaf border — 1px gold outline + soft gold inner glow, gives the
                   *                    block the illuminated-manuscript chrome we use for
                   *                    eyebrow accents elsewhere.
                   *   • Glassy pill capsule — the eyebrow renders as a translucent capsule
                   *                    with a backdrop-blur and gold border, sitting above
                   *                    the title.
                   */
                  <header
                    className="mb-10 relative rounded-2xl pl-7 pr-6 py-6 overflow-hidden"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(38,97,156,0.04) 0%, rgba(201,162,39,0.05) 100%)',
                      border: '1px solid var(--cam-gold-leaf)',
                      boxShadow:
                        '0 1px 0 rgba(201,162,39,0.18), 0 8px 24px -16px rgba(38,97,156,0.18), inset 0 1px 0 rgba(255,255,255,0.35)',
                    }}
                  >
                    {/* Navy strip — sits on the left edge, slightly inset top/bottom */}
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                      style={{
                        background:
                          'linear-gradient(180deg, var(--cam-primary) 0%, var(--cam-primary-dk) 100%)',
                      }}
                    />

                    {/* Glassy pill capsule — eyebrow */}
                    <span
                      className="inline-flex items-center px-3 py-1 mb-3 rounded-full text-[10.5px] font-extrabold uppercase tracking-[0.18em]"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--cam-gold-leaf)',
                        color: 'var(--cam-gold-leaf-text)',
                        boxShadow:
                          '0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.45)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                      }}
                    >
                      {eyebrow}
                    </span>

                    <h1
                      className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3"
                      style={{ color: 'var(--cam-primary)' }}
                    >
                      {title}
                    </h1>
                    <p
                      className="text-base leading-[1.65]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {description}
                    </p>
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
