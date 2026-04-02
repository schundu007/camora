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
  DESKTOP_LIFETIME: process.env.STRIPE_PRICE_DESKTOP,     // $99/mo — Elite (includes 5 Lumora sessions)
};

// Feature flags per plan (credit system deprecated — plans are now feature-based)
export const CREDITS_PER_PLAN = {
  monthly: 0,           // Interview Ready — feature-gated, no credits
  quarterly_pro: 0,     // FAANG Track — feature-gated, no credits
  desktop_lifetime: 0,  // Elite — feature-gated, no credits
};

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured() {
  return !!(stripeSecretKey && (STRIPE_PRICES.MONTHLY || STRIPE_PRICES.QUARTERLY_PRO));
}

export default stripe;
