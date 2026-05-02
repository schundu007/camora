import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Initialize Stripe client. Tight timeout + a single retry so a slow
// Stripe API call can never wedge the request thread for 80 seconds
// (the SDK default), which was the root cause of 502s cascading across
// every AI route — slow Stripe in tryAutoTopup → blocked DB connection
// → pool exhaustion → Railway proxy returns 502.
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-03-31.basil',
      timeout: 5000,
      maxNetworkRetries: 1,
    })
  : null;

// Pricing v3 — three flat options. No tiers, no add-ons.
//
// Set each STRIPE_PRICE_* env var to the matching Stripe Dashboard price ID.
//   STRIPE_PRICE_PRO_MONTHLY  → $19/mo subscription
//   STRIPE_PRICE_PRO_YEARLY   → $99/yr subscription
//   STRIPE_PRICE_TOPUP_1H     → $15 one-time, 1 AI hour
//
// Env-var names retained from v2 so existing tooling / scripts don't churn.
export const STRIPE_PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY,
  TOPUP_1H: process.env.STRIPE_PRICE_TOPUP_1H,
};

/**
 * Boot-time sanity check — logs which subscription price IDs are missing
 * so the operator can populate them in Stripe Dashboard.
 */
export function warnMissingPriceIds() {
  const required = ['PRO_MONTHLY', 'PRO_YEARLY', 'TOPUP_1H'];
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
  return !!STRIPE_PRICES.PRO_MONTHLY;
}

export default stripe;
