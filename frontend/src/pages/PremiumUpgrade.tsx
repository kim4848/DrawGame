import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '../config/stripe';
import StripeCheckoutForm from '../components/StripeCheckoutForm';
import '../styles/PremiumUpgrade.css';

type PaymentMethod = 'stripe' | 'mobilepay' | null;

export default function PremiumUpgrade() {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const stripePromise = getStripe();

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
  };

  const handleBack = () => {
    if (selectedMethod) {
      setSelectedMethod(null);
    } else {
      navigate('/premium');
    }
  };

  return (
    <div className="container premium-upgrade">
      <div className="premium-upgrade__header">
        <button
          className="btn btn--text premium-upgrade__back"
          onClick={handleBack}
          aria-label="Tilbage"
        >
          ← Tilbage
        </button>
        <h1>Opgrader til Premium</h1>
      </div>

      {!selectedMethod ? (
        <div className="premium-upgrade__selection">
          <p className="premium-upgrade__price">
            <strong>29 DKK/måned</strong>
          </p>
          <p className="premium-upgrade__description">
            Få adgang til tilpassede ordpakker og spil uden reklamer
          </p>

          <div className="premium-upgrade__methods">
            <h2>Vælg betalingsmetode</h2>

            <button
              className="payment-method-card"
              onClick={() => handleMethodSelect('stripe')}
            >
              <div className="payment-method-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div className="payment-method-card__content">
                <h3>Stripe</h3>
                <p>Betal med kreditkort eller Dankort</p>
              </div>
              <div className="payment-method-card__arrow">→</div>
            </button>

            <button
              className="payment-method-card payment-method-card--disabled"
              disabled
              title="MobilePay kommer snart"
            >
              <div className="payment-method-card__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12" y2="18"/>
                </svg>
              </div>
              <div className="payment-method-card__content">
                <h3>MobilePay</h3>
                <p>Kommer snart</p>
              </div>
              <div className="payment-method-card__badge">Snart</div>
            </button>
          </div>

          <div className="premium-upgrade__features">
            <h3>Hvad får du med Premium?</h3>
            <ul>
              <li>✓ Tilpassede ordpakker (film, mad, dyr, m.m.)</li>
              <li>✓ Ingen reklamer</li>
              <li>✓ Støt udviklingen af spillet</li>
            </ul>
          </div>
        </div>
      ) : selectedMethod === 'stripe' ? (
        <div className="premium-upgrade__checkout">
          <h2>Stripe betaling</h2>
          <p className="premium-upgrade__checkout-description">
            Udfyld dine kortoplysninger for at oprette dit abonnement på 29 DKK/måned
          </p>

          <Elements stripe={stripePromise}>
            <StripeCheckoutForm onCancel={() => setSelectedMethod(null)} />
          </Elements>
        </div>
      ) : (
        <div className="premium-upgrade__placeholder">
          <h2>MobilePay</h2>
          <p>MobilePay integration kommer snart!</p>
          <button className="btn btn--secondary" onClick={() => setSelectedMethod(null)}>
            Vælg en anden metode
          </button>
        </div>
      )}
    </div>
  );
}
