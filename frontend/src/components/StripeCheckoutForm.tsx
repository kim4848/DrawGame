import { useState } from 'react';
import type { FormEvent } from 'react';
import { createCheckout } from '../api';
import '../styles/StripeCheckoutForm.css';

interface StripeCheckoutFormProps {
  onCancel: () => void;
}

export default function StripeCheckoutForm({ onCancel }: StripeCheckoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { url } = await createCheckout();
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Der opstod en fejl');
      setLoading(false);
    }
  };

  return (
    <form className="stripe-checkout-form" onSubmit={handleSubmit}>
      <div className="stripe-checkout-form__info">
        <div className="info-row">
          <span>Abonnement</span>
          <strong>Premium</strong>
        </div>
        <div className="info-row">
          <span>Pris</span>
          <strong>29 DKK/måned</strong>
        </div>
        <div className="info-row info-row--note">
          <span>Første betaling</span>
          <span>I dag</span>
        </div>
      </div>

      <div className="stripe-checkout-form__notice">
        <p>
          Du vil blive omdirigeret til Stripe's sikre betalingsside for at gennemføre dit køb.
        </p>
        <p className="stripe-checkout-form__notice-small">
          Du kan opsige når som helst via din kontoside.
        </p>
      </div>

      {error && (
        <div className="stripe-checkout-form__error" role="alert">
          {error}
        </div>
      )}

      <div className="stripe-checkout-form__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Annuller
        </button>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={loading}
        >
          {loading ? 'Omdirigerer...' : 'Fortsæt til betaling →'}
        </button>
      </div>

      <div className="stripe-checkout-form__secure">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Sikker betaling via Stripe
      </div>
    </form>
  );
}
