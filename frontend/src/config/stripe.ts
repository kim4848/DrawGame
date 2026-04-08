import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';

// Stripe publishable key from environment
// In development: Set VITE_STRIPE_PUBLISHABLE_KEY in .env
// In production: Set via Docker environment variable
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

if (!stripePublishableKey) {
  console.warn('VITE_STRIPE_PUBLISHABLE_KEY not set. Stripe payments will not work.');
}

// Singleton promise for Stripe instance
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise && stripePublishableKey) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise || Promise.resolve(null);
}

export { stripePublishableKey };
