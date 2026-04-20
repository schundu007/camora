import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Initialize Stripe client
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-03-31.basil',
    })
  : null;

// Price IDs from Stripe Dashboard — matches lumora-backend env vars
export const STRIPE_PRICES = {
  MONTHLY_STARTER: process.env.STRIPE_PRICE_STARTER,          // $29/mo — Frost (no desktop)
  MONTHLY_PRO: process.env.STRIPE_PRICE_MONTHLY,              // $49/mo — Winter Lover (with desktop)
  QUARTERLY_PRO: process.env.STRIPE_PRICE_QUARTERLY,           // $119/qtr — Blizzard (with desktop)
  ANNUAL: process.env.STRIPE_PRICE_YEARLY,                     // $228/yr — Avalanche (no desktop)
  ANNUAL_DESKTOP: process.env.STRIPE_PRICE_ANNUALLY,           // $299/yr — Avalanche+ (with desktop)
  DESKTOP_LIFETIME: process.env.STRIPR_PRICE_DTOPLT,           // $99 one-time — Desktop only (BYOK)
};

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured() {
  return !!(stripeSecretKey && (STRIPE_PRICES.MONTHLY_STARTER || STRIPE_PRICES.MONTHLY_PRO));
}

export default stripe;
