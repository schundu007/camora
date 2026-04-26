import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Initialize Stripe client
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-03-31.basil',
    })
  : null;

// Pricing v2 — fixed Capra content + metered AI hours.
// Set each STRIPE_PRICE_* env var to the matching Stripe Dashboard price ID.
export const STRIPE_PRICES = {
  CAPRA_CONTENT_MONTHLY: process.env.STRIPE_PRICE_CAPRA_CONTENT_MONTHLY,    // $19/mo  — content only, no hours
  CAPRA_CONTENT_YEARLY: process.env.STRIPE_PRICE_CAPRA_CONTENT_YEARLY,      // $99/yr  — content only, no hours
  STARTER: process.env.STRIPE_PRICE_STARTER,                                // $29/mo  — content + 4 hrs
  PRO: process.env.STRIPE_PRICE_PRO,                                        // $59/mo  — content + 10 hrs (popular)
  PRO_MAX: process.env.STRIPE_PRICE_PRO_MAX,                                // $99/mo  — content + 25 hrs
  ANNUAL_PRO: process.env.STRIPE_PRICE_ANNUAL_PRO,                          // $499/yr — content + 120 hrs pooled
  DESKTOP_LIFETIME: process.env.STRIPE_PRICE_DESKTOP_LIFETIME || process.env.STRIPR_PRICE_DTOPLT, // $99 one-time

  // Hour top-up packs (one-time, 90-day expiry enforced server-side).
  // 1H/3H are student-friendly entry points; per-hour rate decreases with volume.
  TOPUP_1H: process.env.STRIPE_PRICE_TOPUP_1H,
  TOPUP_3H: process.env.STRIPE_PRICE_TOPUP_3H,
  TOPUP_5H: process.env.STRIPE_PRICE_TOPUP_5H,
  TOPUP_10H: process.env.STRIPE_PRICE_TOPUP_10H,
  TOPUP_25H: process.env.STRIPE_PRICE_TOPUP_25H,
};

/**
 * Boot-time sanity check — logs which subscription price IDs are missing
 * so the operator can populate them in Stripe Dashboard.
 */
export function warnMissingPriceIds() {
  const required = [
    'CAPRA_CONTENT_MONTHLY',
    'CAPRA_CONTENT_YEARLY',
    'STARTER',
    'PRO',
    'PRO_MAX',
    'ANNUAL_PRO',
  ];
  const missing = required.filter((k) => !STRIPE_PRICES[k]);
  if (missing.length) {
    console.warn(
      `[stripe] Missing price IDs for SKUs: ${missing.join(', ')}. `
      + `Set the matching STRIPE_PRICE_* env vars from the Stripe Dashboard.`,
    );
  }
}

export function isStripeConfigured() {
  if (!stripeSecretKey) return false;
  return !!(STRIPE_PRICES.CAPRA_CONTENT_MONTHLY || STRIPE_PRICES.STARTER || STRIPE_PRICES.PRO);
}

export default stripe;
