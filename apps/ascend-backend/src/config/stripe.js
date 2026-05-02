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

// Pricing v3.2 — three pricing primitives:
//
//   STRIPE_PRICE_PRO_MONTHLY  → $19/mo solo
//   STRIPE_PRICE_PRO_YEARLY   → $99/yr solo
//   STRIPE_PRICE_TOPUP_1H     → $15 one-time, 1 AI hour. Quantity:N at
//                                checkout for multi-hour buys.
//   STRIPE_PRODUCT_TEAM       → Single Stripe Product for the dynamic
//                                team plan. Price computed per checkout
//                                via price_data: $(seats × 20 − 1)/mo.
export const STRIPE_PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY,
  TOPUP_1H: process.env.STRIPE_PRICE_TOPUP_1H,
};

/**
 * Boot-time sanity check — logs which price IDs are missing so the
 * operator can populate them in Stripe Dashboard.
 */
export function warnMissingPriceIds() {
  const required = ['PRO_MONTHLY', 'PRO_YEARLY', 'TOPUP_1H'];
  const missing = required.filter((k) => !STRIPE_PRICES[k]);
  if (!process.env.STRIPE_PRODUCT_TEAM) missing.push('PRODUCT_TEAM');
  if (missing.length) {
    console.warn(
      `[stripe] Missing IDs: ${missing.join(', ')}. `
      + `Set STRIPE_PRICE_* / STRIPE_PRODUCT_TEAM env vars from the Stripe Dashboard.`,
    );
  }
}

export function isStripeConfigured() {
  if (!stripeSecretKey) return false;
  return !!STRIPE_PRICES.PRO_MONTHLY;
}

export default stripe;
