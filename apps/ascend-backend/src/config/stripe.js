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

// Pricing v2 — 3 plans (Free / Pro / Pro Max) with monthly + yearly billing.
// Yearly is ~17% cheaper than 12× monthly; Pro Max gets a 10% subscriber
// discount on hours ($9/hr vs $10/hr standard).
//
// Set each STRIPE_PRICE_* env var to the matching Stripe Dashboard price ID.
export const STRIPE_PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,                 // $29/mo  — 2 AI hrs
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY,                   // $290/yr — 24 AI hrs
  PRO_MAX_MONTHLY: process.env.STRIPE_PRICE_PRO_MAX_MONTHLY,         // $79/mo  — 8 AI hrs (10% off)
  PRO_MAX_YEARLY: process.env.STRIPE_PRICE_PRO_MAX_YEARLY,           // $790/yr — 96 AI hrs (10% off)
  DESKTOP_LIFETIME: process.env.STRIPE_PRICE_DESKTOP_LIFETIME || process.env.STRIPR_PRICE_DTOPLT, // $99 one-time, single user
  BUSINESS_DESKTOP_LIFETIME: process.env.STRIPE_PRICE_BUSINESS_DESKTOP_LIFETIME, // $999 one-time, 10 seats

  // Hour top-up packs (one-time, 90-day expiry, flat $10/hr)
  TOPUP_1H: process.env.STRIPE_PRICE_TOPUP_1H,
  TOPUP_5H: process.env.STRIPE_PRICE_TOPUP_5H,
  TOPUP_25H: process.env.STRIPE_PRICE_TOPUP_25H,

  // Business starter pack — one-time $499, 75 AI hours + 10 seats, PAYG @ $8/hr after.
  BUSINESS_STARTER: process.env.STRIPE_PRICE_BUSINESS_STARTER,
};

/**
 * Boot-time sanity check — logs which subscription price IDs are missing
 * so the operator can populate them in Stripe Dashboard.
 */
export function warnMissingPriceIds() {
  const required = [
    'PRO_MONTHLY',
    'PRO_YEARLY',
    'PRO_MAX_MONTHLY',
    'PRO_MAX_YEARLY',
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
  return !!(STRIPE_PRICES.PRO_MONTHLY || STRIPE_PRICES.PRO_MAX_MONTHLY);
}

export default stripe;
