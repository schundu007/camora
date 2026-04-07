/**
 * Company Logo component — renders brand-colored company logos
 * Uses official brand colors and simple SVG icons
 */

const COMPANY_LOGOS: Record<string, { color: string; bg: string; icon: string }> = {
  netflix:      { color: '#E50914', bg: '#E5091410', icon: 'N' },
  'twitter':    { color: '#1DA1F2', bg: '#1DA1F210', icon: '𝕏' },
  uber:         { color: '#000000', bg: '#00000010', icon: 'U' },
  youtube:      { color: '#FF0000', bg: '#FF000010', icon: '▶' },
  whatsapp:     { color: '#25D366', bg: '#25D36610', icon: '📱' },
  instagram:    { color: '#E4405F', bg: '#E4405F10', icon: '📷' },
  dropbox:      { color: '#0061FF', bg: '#0061FF10', icon: '📦' },
  'google-docs':{ color: '#4285F4', bg: '#4285F410', icon: 'G' },
  amazon:       { color: '#FF9900', bg: '#FF990010', icon: 'a' },
  stripe:       { color: '#635BFF', bg: '#635BFF10', icon: 'S' },
  paypal:       { color: '#003087', bg: '#00308710', icon: 'P' },
  ticketmaster: { color: '#026CDF', bg: '#026CDF10', icon: '🎫' },
  spotify:      { color: '#1DB954', bg: '#1DB95410', icon: '♫' },
  reddit:       { color: '#FF4500', bg: '#FF450010', icon: 'R' },
  tiktok:       { color: '#000000', bg: '#00000010', icon: '♪' },
  slack:        { color: '#4A154B', bg: '#4A154B10', icon: '#' },
  discord:      { color: '#5865F2', bg: '#5865F210', icon: 'D' },
  zoom:         { color: '#2D8CFF', bg: '#2D8CFF10', icon: 'Z' },
  tinder:       { color: '#FE3C72', bg: '#FE3C7210', icon: '🔥' },
  doordash:     { color: '#FF3008', bg: '#FF300810', icon: 'D' },
  shopify:      { color: '#96BF48', bg: '#96BF4810', icon: '🛒' },
  linkedin:     { color: '#0A66C2', bg: '#0A66C210', icon: 'in' },
  facebook:     { color: '#1877F2', bg: '#1877F210', icon: 'f' },
  gmail:        { color: '#EA4335', bg: '#EA433510', icon: '✉' },
  airbnb:       { color: '#FF5A5F', bg: '#FF5A5F10', icon: 'A' },
  twitch:       { color: '#9146FF', bg: '#9146FF10', icon: '📺' },
  // Generic fallbacks
  'web-search': { color: '#4285F4', bg: '#4285F410', icon: '🔍' },
  'rate-limiter':{ color: '#10b981', bg: '#10b98110', icon: '⚡' },
  notification: { color: '#F59E0B', bg: '#F59E0B10', icon: '🔔' },
  typeahead:    { color: '#8B5CF6', bg: '#8B5CF610', icon: '⌨' },
};

// Map topic IDs to company keys
const TOPIC_TO_COMPANY: Record<string, string> = {
  netflix: 'netflix',
  'twitter-x': 'twitter',
  'twitter': 'twitter',
  uber: 'uber',
  'uber-lyft': 'uber',
  youtube: 'youtube',
  whatsapp: 'whatsapp',
  instagram: 'instagram',
  'dropbox-google-drive': 'dropbox',
  'dropbox': 'dropbox',
  'google-drive': 'dropbox',
  'google-docs': 'google-docs',
  amazon: 'amazon',
  'amazon-e-commerce': 'amazon',
  'payment-system': 'stripe',
  stripe: 'stripe',
  paypal: 'paypal',
  ticketmaster: 'ticketmaster',
  spotify: 'spotify',
  reddit: 'reddit',
  tiktok: 'tiktok',
  slack: 'slack',
  discord: 'discord',
  zoom: 'zoom',
  tinder: 'tinder',
  doordash: 'doordash',
  shopify: 'shopify',
  linkedin: 'linkedin',
  facebook: 'facebook',
  'facebook-news-feed': 'facebook',
  gmail: 'gmail',
  airbnb: 'airbnb',
  twitch: 'twitch',
  'web-search-engine': 'web-search',
  'rate-limiter': 'rate-limiter',
  'notification-system': 'notification',
  'typeahead-autocomplete': 'typeahead',
};

interface CompanyLogoProps {
  topicId: string;
  size?: number;
  className?: string;
}

export function CompanyLogo({ topicId, size = 32, className = '' }: CompanyLogoProps) {
  const companyKey = TOPIC_TO_COMPANY[topicId.toLowerCase()];
  const logo = companyKey ? COMPANY_LOGOS[companyKey] : null;

  if (!logo) return null;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        background: logo.bg,
        border: `1.5px solid ${logo.color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{
        fontSize: size * 0.45,
        fontWeight: 800,
        color: logo.color,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        lineHeight: 1,
      }}>
        {logo.icon}
      </span>
    </div>
  );
}

export function getCompanyColor(topicId: string): string | null {
  const companyKey = TOPIC_TO_COMPANY[topicId.toLowerCase()];
  return companyKey ? COMPANY_LOGOS[companyKey]?.color || null : null;
}

export default CompanyLogo;
