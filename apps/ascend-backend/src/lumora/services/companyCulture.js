/**
 * Company-specific culture frames for behavioral answers.
 * When the user's JD names one of these companies, we append the culture
 * frame to the system prompt so STAR answers align with how that company
 * evaluates candidates.
 *
 * Keep entries short — 1-2 sentences per company, focused on the framing
 * dimension that matters most. Extend when we see enough JDs from a new
 * company to justify adding it.
 */

const CULTURES = [
  {
    company: 'Amazon',
    aliases: ['amazon.com', 'amzn', 'aws'],
    frame: 'Frame answers around Amazon Leadership Principles. Prefer stories demonstrating Customer Obsession, Ownership, Bias for Action, Invent and Simplify, Deliver Results, Dive Deep, and Are Right, A Lot. Use concrete metrics in every Result line.',
  },
  {
    company: 'Netflix',
    aliases: ['netflix.com'],
    frame: 'Frame answers around Netflix Freedom & Responsibility. Show judgment, candor, independent decision-making, and willingness to disagree openly. Avoid process-heavy narratives.',
  },
  {
    company: 'Meta',
    aliases: ['facebook', 'meta.com', 'instagram', 'whatsapp'],
    frame: 'Frame answers around Meta values: Move Fast, Focus on Long-Term Impact, Build Awesome Things, Live in the Future, Be Direct and Respect Your Colleagues, Meta Metamates Me. Favor quantified user-growth or engagement metrics.',
  },
  {
    company: 'Google',
    aliases: ['google.com', 'alphabet', 'youtube'],
    frame: 'Frame answers around Googleyness: intellectual humility, collaboration across teams, data-driven decisions, comfort with ambiguity, and passion for the mission. Show RRK — Role-Related Knowledge — depth.',
  },
  {
    company: 'Apple',
    aliases: ['apple.com'],
    frame: 'Frame answers around Apple values: craftsmanship, attention to detail, cross-functional rigor, privacy-by-design, secrecy discipline, and relentless iteration toward quality over ship-date.',
  },
  {
    company: 'Microsoft',
    aliases: ['microsoft.com', 'msft'],
    frame: 'Frame answers around growth mindset, learn-it-all vs know-it-all, customer empathy, One Microsoft collaboration, and diversity & inclusion. Show how you unblocked another team.',
  },
  {
    company: 'Stripe',
    aliases: ['stripe.com'],
    frame: 'Frame answers around Stripe operating principles: Users First, Move with Urgency and Focus, Think Rigorously, Seek Feedback, Global Optimization. Technical depth + clarity of written thinking matter.',
  },
  {
    company: 'Airbnb',
    aliases: ['airbnb.com'],
    frame: 'Frame answers around Airbnb core values: Champion the Mission, Be a Host, Embrace the Adventure, Be a Cereal Entrepreneur. Show empathy for hosts/guests and willingness to do small things that matter.',
  },
  {
    company: 'Uber',
    aliases: ['uber.com'],
    frame: 'Frame answers around Uber Cultural Norms: We build globally, we live locally; We are customer obsessed; We celebrate differences; We do the right thing. Show scale-appropriate decisions.',
  },
  {
    company: 'Tesla',
    aliases: ['tesla.com'],
    frame: 'Frame answers around Tesla values: Move Fast, Innovate, Do the Impossible, Reason from First Principles. Tolerate high velocity, long hours narratives, and direct conflict. Results >>> process.',
  },
  {
    company: 'Anthropic',
    aliases: ['anthropic.com'],
    frame: 'Frame answers around Anthropic values: Act for the Global Good, Hold Light and Shade (honesty about tradeoffs), Be Helpful-Harmless-Honest, Put the Mission First. Show AI safety thoughtfulness.',
  },
  {
    company: 'OpenAI',
    aliases: ['openai.com'],
    frame: 'Frame answers around OpenAI operating principles: Scale, Make Something People Want, Team Spirit, Unpretentious, Impact-Driven, Intense. Show velocity and willingness to rewrite.',
  },
  {
    company: 'Databricks',
    aliases: ['databricks.com'],
    frame: 'Frame answers around Databricks values: Customer Obsession, Truth-Seeking, Own It, Let the Best Idea Win, Raise the Bar, Team On the Field. Show data-driven reasoning.',
  },
  {
    company: 'Nvidia',
    aliases: ['nvidia.com'],
    frame: 'Frame answers around Nvidia values: Intellectual Honesty, Speed & Agility, One Team, Excellence & Determination. Show deep technical rigor and cross-disciplinary collaboration.',
  },
  {
    company: 'Shopify',
    aliases: ['shopify.com'],
    frame: 'Frame answers around Shopify values: Get Shit Done, Thrive on Change, Trust Through Transparency, Build for the Long Term, Great Merchants. Show principal-level ownership at all levels.',
  },
];

/**
 * Return the culture frame string for a given systemContext (which includes the
 * pasted JD + company fields), or an empty string if no match.
 */
export function getCultureFrame(systemContext) {
  if (!systemContext || typeof systemContext !== 'string') return '';
  const lower = systemContext.toLowerCase();
  for (const c of CULTURES) {
    if (lower.includes(c.company.toLowerCase())) return `COMPANY CULTURE FRAME — ${c.company}:\n${c.frame}`;
    for (const alias of c.aliases) {
      if (lower.includes(alias.toLowerCase())) return `COMPANY CULTURE FRAME — ${c.company}:\n${c.frame}`;
    }
  }
  return '';
}

export { CULTURES };
