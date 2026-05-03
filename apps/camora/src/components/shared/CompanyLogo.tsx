/**
 * CompanyLogo — renders real company logos from /logos/ directory
 * Logos sourced from logo.dev and tickerlogos.com
 */

const LOGO_MAP: Record<string, string> = {
  netflix: '/logos/netflix.png',
  'twitter-x': '/logos/twitter.png',
  twitter: '/logos/twitter.png',
  uber: '/logos/uber.png',
  'uber-lyft': '/logos/uber.png',
  youtube: '/logos/youtube.png',
  whatsapp: '/logos/whatsapp.png',
  instagram: '/logos/instagram.png',
  dropbox: '/logos/dropbox.png',
  'dropbox-google-drive': '/logos/dropbox.png',
  'google-drive': '/logos/google.png',
  'google-docs': '/logos/google.png',
  google: '/logos/google.png',
  amazon: '/logos/amazon.png',
  'amazon-e-commerce': '/logos/amazon.png',
  'payment-system': '/logos/stripe.png',
  stripe: '/logos/stripe.png',
  paypal: '/logos/paypal.png',
  ticketmaster: '/logos/ticketmaster.png',
  spotify: '/logos/spotify.png',
  reddit: '/logos/reddit.png',
  tiktok: '/logos/tiktok.png',
  slack: '/logos/slack.png',
  discord: '/logos/discord.png',
  zoom: '/logos/zoom.png',
  tinder: '/logos/tinder.png',
  doordash: '/logos/doordash.png',
  shopify: '/logos/shopify.png',
  linkedin: '/logos/linkedin.png',
  facebook: '/logos/facebook.png',
  'facebook-news-feed': '/logos/facebook.png',
  gmail: '/logos/gmail.png',
  airbnb: '/logos/airbnb.png',
  twitch: '/logos/twitch.png',
  // Cloud providers (used in diagram selectors)
  aws: '/logos/aws.png',
  azure: '/logos/azure.png',
  gcp: '/logos/gcp.png',
  // Search/generic
  'web-search-engine': '/logos/google.png',
};

interface CompanyLogoProps {
  topicId: string;
  size?: number;
  className?: string;
}

export function CompanyLogo({ topicId, size = 32, className = '' }: CompanyLogoProps) {
  const logoSrc = LOGO_MAP[topicId.toLowerCase()];
  if (!logoSrc) return null;

  return (
    <img
      src={logoSrc}
      alt={`${topicId} logo`}
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        borderRadius: size * 0.2,
        flexShrink: 0,
      }}
      loading="lazy"
    />
  );
}

export function getCompanyLogoSrc(topicId: string): string | null {
  return LOGO_MAP[topicId.toLowerCase()] || null;
}

export default CompanyLogo;
