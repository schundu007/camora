import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: string;
}

const DEFAULTS = {
  title: 'Camora – AI Interview Prep for DevOps and Cloud Engineers',
  description: 'Ace every technical interview with AI-powered prep. System design, coding, behavioral — all formats. Real-time interview assistance with Lumora.',
  image: 'https://camora.cariara.com/images/og-cover.png',
  url: 'https://camora.cariara.com',
};

export default function SEO({ title, description, path = '', image, type = 'website' }: SEOProps) {
  const fullTitle = title ? `${title} | Camora` : DEFAULTS.title;
  const desc = description || DEFAULTS.description;
  const url = `${DEFAULTS.url}${path}`;
  const img = image || DEFAULTS.image;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta property="og:type" content={type} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  );
}
