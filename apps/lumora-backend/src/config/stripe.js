import Stripe from 'stripe';

let _stripe = null;

/**
 * Lazy-initialized Stripe client. Returns null when STRIPE_SECRET_KEY is absent.
 */
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}
