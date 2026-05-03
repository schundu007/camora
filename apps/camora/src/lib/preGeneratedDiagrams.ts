/**
 * Pre-generated diagram lookup.
 *
 * apps/camora/public/diagrams/<slug>/eraser-{aws,azure,gcp}.png contains
 * 80+ team-curated, eraser-style architecture diagrams that match common
 * system-design problems. The /capra/design page generates fresh Graphviz
 * diagrams server-side as a last resort — but those are inferior to the
 * pre-curated ones for problems we already have art for. (D2 was removed;
 * this comment used to reference it.)
 *
 * This module fuzzy-maps a free-text question ("Design a tiny URL System")
 * to one of the topic slugs, then returns a public URL to the matching
 * pre-generated PNG. handleGenerateDiagram() tries this FIRST and only
 * falls back to the runtime path if no slug matches.
 *
 * To grow: add a (regex, slug) tuple to QUESTION_PATTERNS. Patterns are
 * matched in order — put more specific patterns first.
 */

type CloudProvider = 'auto' | 'aws' | 'azure' | 'gcp';

/**
 * Ordered keyword → slug map. Each pattern is a case-insensitive regex
 * matched against a normalized question (lowercased, punctuation
 * stripped). Order matters: "tiny url" must come before "url" so the
 * more specific match wins.
 */
const QUESTION_PATTERNS: Array<{ pattern: RegExp; slug: string }> = [
  // URL shortener variants — both slugs ship the same eraser art
  { pattern: /\btiny.?url\b/i, slug: 'tiny-url' },
  { pattern: /\burl.?shortener\b|\burl.?shortning\b|\bbit\.?ly\b|\btinyurl\b/i, slug: 'url-shortener' },

  // Social / feeds
  { pattern: /\b(twitter|x).?(trends|trending)\b/i, slug: 'twitter-trends' },
  { pattern: /\btwitter\b|\bx\s+(feed|social)\b/i, slug: 'twitter' },
  { pattern: /\binstagram\b/i, slug: 'instagram' },
  { pattern: /\bfacebook.?newsfeed\b|\bnews.?feed\b/i, slug: 'facebook-newsfeed' },
  { pattern: /\blinkedin\b/i, slug: 'linkedin' },
  { pattern: /\btiktok\b/i, slug: 'tiktok' },
  { pattern: /\breddit\b/i, slug: 'reddit' },
  { pattern: /\bnews.?aggregat/i, slug: 'news-aggregator' },

  // Streaming / media
  { pattern: /\byoutube.?(top|trending)\b/i, slug: 'youtube-top-k-trending' },
  { pattern: /\byoutube\b/i, slug: 'youtube' },
  { pattern: /\bnetflix\b/i, slug: 'netflix' },
  { pattern: /\bspotify\b/i, slug: 'spotify' },
  { pattern: /\btwitch\b/i, slug: 'twitch' },

  // Communication
  { pattern: /\bwhatsapp\b/i, slug: 'whatsapp' },
  { pattern: /\bchat.?(system|app)\b|\bmessaging.?app\b/i, slug: 'chat-system' },
  { pattern: /\bzoom\b|\bvideo.?conferenc/i, slug: 'zoom' },
  { pattern: /\bnotification.?(system|service)\b/i, slug: 'notification-system' },
  { pattern: /\bslack\b/i, slug: 'slack' },
  { pattern: /\bgmail\b|\bemail.?(system|service)\b/i, slug: 'gmail' },

  // E-commerce / marketplace
  { pattern: /\bamazon\b/i, slug: 'amazon' },
  { pattern: /\bairbnb\b/i, slug: 'airbnb' },
  { pattern: /\bdoordash\b|\bfood.?delivery\b/i, slug: 'doordash' },
  { pattern: /\byelp\b|\bproximity.?service\b/i, slug: 'proximity-service' },
  { pattern: /\bticketmaster\b|\bticket.?(booking|reservation)\b/i, slug: 'ticketmaster' },
  { pattern: /\bhotel.?(booking|reservation)\b|\bbooking\.com\b/i, slug: 'hotel-booking' },
  { pattern: /\b(uber|lyft|ride.?sharing|ride.?hailing)\b/i, slug: 'uber' },
  { pattern: /\btinder\b|\bdating.?app\b/i, slug: 'tinder' },
  { pattern: /\becommerce\b|\bonline.?shopping\b/i, slug: 'ecommerce-platform' },
  { pattern: /\bshopify\b/i, slug: 'shopify' },
  { pattern: /\bonline.?auction\b|\bebay\b/i, slug: 'online-auction' },

  // Payments / wallets
  { pattern: /\bpayment.?gateway\b/i, slug: 'payment-gateway' },
  { pattern: /\bpayment.?(system|service)\b|\bstripe\b|\bpaypal\b/i, slug: 'payment-system' },
  { pattern: /\bdigital.?wallet\b|\bvenmo\b/i, slug: 'digital-wallet' },
  { pattern: /\bstock.?(exchange|trading)\b|\brobinhood\b/i, slug: 'stock-exchange' },
  { pattern: /\bflash.?sale\b/i, slug: 'flash-sale' },

  // Storage / files
  { pattern: /\bdropbox\b|\bgoogle.?drive\b|\bfile.?(storage|sharing)\b/i, slug: 'dropbox' },
  { pattern: /\bblob.?(store|storage)\b/i, slug: 'blob-store' },
  { pattern: /\bobject.?storage\b|\bs3.?clone\b/i, slug: 'object-storage' },
  { pattern: /\bpastebin\b|\btext.?sharing\b/i, slug: 'pastebin' },
  { pattern: /\bgoogle.?docs\b|\bcollaborative.?(editing|document)\b/i, slug: 'google-docs' },
  { pattern: /\bdistributed.?file.?system\b|\bhdfs\b/i, slug: 'distributed-file-systems' },

  // Infrastructure / utilities
  { pattern: /\brate.?limit/i, slug: 'rate-limiter' },
  { pattern: /\b(typeahead|autocomplete)\b/i, slug: 'autocomplete-system' },
  { pattern: /\bgoogle.?maps\b|\bnavigation.?(system|service)\b/i, slug: 'google-maps' },
  { pattern: /\bleaderboard\b/i, slug: 'leaderboard' },
  { pattern: /\btop.?k.?leaderboard\b|\btop.?k\b/i, slug: 'top-k-leaderboard' },
  { pattern: /\bweb.?crawler\b/i, slug: 'web-crawler' },
  { pattern: /\bsearch.?engine\b|\bgoogle.?search\b/i, slug: 'search-engine' },
  { pattern: /\bdistributed.?search\b|\belasticsearch\b/i, slug: 'distributed-search' },
  { pattern: /\bkey.?value.?store\b|\bredis.?clone\b|\bdistributed.?(cache|kv)\b/i, slug: 'key-value-store' },
  { pattern: /\bdistributed.?cache\b/i, slug: 'distributed-cache' },
  { pattern: /\bdistributed.?lock\b/i, slug: 'distributed-lock' },
  { pattern: /\bunique.?id\b|\bsnowflake\b|\bid.?generator\b/i, slug: 'unique-id-generator' },
  { pattern: /\bad.?click.?aggregat/i, slug: 'ad-click-aggregation' },
  { pattern: /\bmetrics.?(monitoring|system)\b/i, slug: 'metrics-monitoring' },
  { pattern: /\bjob.?scheduler\b|\btask.?scheduler\b/i, slug: 'job-scheduler' },
  { pattern: /\bdistributed.?task\b/i, slug: 'distributed-task-scheduler' },
  { pattern: /\bcalendar.?(system|service)\b/i, slug: 'calendar-system' },
  { pattern: /\bonline.?chess\b/i, slug: 'online-chess' },
  { pattern: /\bchatgpt\b|\bllm\b|\bai.?(chatbot|assistant)\b/i, slug: 'chatgpt-llm-system' },
  { pattern: /\bdeployment.?system\b|\bdeploy/i, slug: 'deployment-system' },
  { pattern: /\bci.?cd\b|\bjenkins\b/i, slug: 'ci-cd-pipeline' },
  { pattern: /\bprice.?tracking\b/i, slug: 'price-tracking-service' },
  { pattern: /\bstrava\b|\bfitness.?tracking\b/i, slug: 'strava-fitness-tracking' },
  { pattern: /\brecommendation.?(engine|system)\b/i, slug: 'recommendation-engine' },
  { pattern: /\bleetcode\b|\bonline.?judge\b/i, slug: 'leetcode-online-judge' },
  { pattern: /\bcdn\b|\bcontent.?delivery\b/i, slug: 'cdn' },
  { pattern: /\bapi.?gateway\b/i, slug: 'api-gateway' },
  { pattern: /\bload.?balanc/i, slug: 'load-balancing' },
  { pattern: /\bmessage.?queue\b|\bkafka\b|\brabbitmq\b/i, slug: 'message-queues' },
];

/**
 * Normalize a question text for pattern matching.
 * Lowercase, collapse whitespace, strip leading "design ".
 */
function normalize(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^design\s+(a|an|the)\s+/, '');
}

/**
 * Resolve a free-text question to a topic slug, or null if no match.
 */
export function resolveTopicSlug(question: string): string | null {
  if (!question) return null;
  const normalized = normalize(question);
  for (const { pattern, slug } of QUESTION_PATTERNS) {
    if (pattern.test(normalized)) return slug;
  }
  return null;
}

/**
 * Resolve a question + cloud provider to a public URL of the
 * pre-generated eraser-style diagram, or null if no match exists.
 *
 * For 'auto', falls through cloud providers in order: aws → azure → gcp.
 * 'aws' is preferred because most public interview material uses AWS
 * naming, so the visual matches what the candidate is most likely to
 * have studied.
 *
 * Returned URL is rooted at /diagrams/... so it's served by Vite static
 * assets in dev and Vercel's CDN in prod.
 */
export function resolvePreGeneratedDiagram(
  question: string,
  cloudProvider: CloudProvider = 'auto',
): string | null {
  const slug = resolveTopicSlug(question);
  if (!slug) return null;

  const order: Array<'aws' | 'azure' | 'gcp'> =
    cloudProvider === 'aws' ? ['aws']
    : cloudProvider === 'azure' ? ['azure', 'aws']
    : cloudProvider === 'gcp' ? ['gcp', 'aws']
    : ['aws', 'azure', 'gcp'];

  // We can't statSync at runtime in the browser, so just return the
  // first cloud's URL and let the <img onError> handler trigger fallback
  // if the file doesn't exist. The slug detector above only returns
  // slugs that have aws-tier coverage in the eraser repo (verified
  // 2026-05).
  return `/diagrams/${slug}/eraser-${order[0]}.png`;
}
