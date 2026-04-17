import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Initialize Stripe client
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-03-31.basil',
    })
  : null;

// Price IDs from Stripe Dashboard
export const STRIPE_PRICES = {
  MONTHLY: process.env.STRIPE_PRICE_MONTHLY,              // $29/mo — Interview Ready
  QUARTERLY_PRO: process.env.STRIPE_PRICE_QUARTERLY_PRO,  // $59/mo — FAANG Track (includes 3 Lumora sessions)
  DESKTOP_MONTHLY: process.env.STRIPE_PRICE_DESKTOP_MONTHLY,  // $29/mo — Desktop App add-on (monthly)
  DESKTOP_ANNUAL: process.env.STRIPE_PRICE_DESKTOP_ANNUAL,    // $99/year — Desktop App add-on (annual)
  // Legacy alias
  DESKTOP_LIFETIME: process.env.STRIPE_PRICE_DESKTOP || process.env.STRIPE_PRICE_DESKTOP_ANNUAL,
};

// Feature flags per plan (credit system deprecated — plans are now feature-based)
export const CREDITS_PER_PLAN = {
  monthly: 0,           // Interview Ready — feature-gated, no credits
  quarterly_pro: 0,     // FAANG Track — feature-gated, no credits
  desktop_monthly: 0,   // Desktop add-on monthly — feature-gated
  desktop_annual: 0,    // Desktop add-on annual — feature-gated
  desktop_lifetime: 0,  // Legacy alias
};

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured() {
  return !!(stripeSecretKey && (STRIPE_PRICES.MONTHLY || STRIPE_PRICES.QUARTERLY_PRO));
}

export default stripe;
