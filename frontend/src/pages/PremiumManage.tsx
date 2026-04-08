import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePremium } from '../hooks/usePremium';
import { createPortalSession } from '../api';
import '../styles/PremiumManage.css';

export default function PremiumManage() {
  const navigate = useNavigate();
  const { subscriptionStatus, loading: premiumLoading } = usePremium();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManageSubscription = async () => {
    setError(null);
    setLoading(true);

    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Der opstod en fejl');
      setLoading(false);
    }
  };

  if (premiumLoading) {
    return (
      <div className="container premium-manage">
        <p>Indlæser...</p>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { label: 'Aktiv', className: 'status-badge--active' },
      canceled: { label: 'Opsagt', className: 'status-badge--canceled' },
      past_due: { label: 'Forfald', className: 'status-badge--past-due' },
      free: { label: 'Gratis', className: 'status-badge--free' },
    };
    return badges[status as keyof typeof badges] || { label: status, className: '' };
  };

  const statusBadge = getStatusBadge(subscriptionStatus.status);

  return (
    <div className="container premium-manage">
      <div className="premium-manage__header">
        <button
          className="btn btn--text premium-manage__back"
          onClick={() => navigate('/premium')}
        >
          ← Tilbage til Premium
        </button>
        <h1>Administrer abonnement</h1>
      </div>

      <div className="premium-manage__content">
        <div className="subscription-card">
          <div className="subscription-card__header">
            <h2>Premium abonnement</h2>
            <span className={`status-badge ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>

          <div className="subscription-card__details">
            <div className="detail-row">
              <span>Status</span>
              <strong>{subscriptionStatus.isPremium ? 'Premium aktiv' : 'Ikke premium'}</strong>
            </div>

            {subscriptionStatus.isPremium && subscriptionStatus.expiresAt && (
              <div className="detail-row">
                <span>Næste betaling</span>
                <strong>{formatDate(subscriptionStatus.expiresAt)}</strong>
              </div>
            )}

            <div className="detail-row">
              <span>Pris</span>
              <strong>29 DKK/måned</strong>
            </div>
          </div>
        </div>

        {error && (
          <div className="premium-manage__error" role="alert">
            {error}
          </div>
        )}

        <div className="premium-manage__actions">
          <button
            className="btn btn--primary"
            onClick={handleManageSubscription}
            disabled={loading}
          >
            {loading ? 'Omdirigerer...' : 'Åbn kundecenter'}
          </button>

          <div className="premium-manage__info">
            <p>
              <strong>Hvad kan du gøre i kundecenteret?</strong>
            </p>
            <ul>
              <li>Opdater betalingsmetode</li>
              <li>Se fakturaer og betalingshistorik</li>
              <li>Opsig abonnement</li>
              <li>Gendan opsagt abonnement</li>
            </ul>
            <p className="premium-manage__info-note">
              Du vil blive omdirigeret til Stripe's sikre kundecenter.
            </p>
          </div>
        </div>

        {subscriptionStatus.status === 'canceled' && (
          <div className="premium-manage__notice premium-manage__notice--warning">
            <strong>Dit abonnement er opsagt</strong>
            <p>
              Du har fortsat adgang til premium-funktioner indtil{' '}
              {subscriptionStatus.expiresAt && formatDate(subscriptionStatus.expiresAt)}.
              Du kan genaktivere dit abonnement via kundecenteret.
            </p>
          </div>
        )}

        {!subscriptionStatus.isPremium && (
          <div className="premium-manage__notice premium-manage__notice--info">
            <strong>Du har ikke et aktivt premium abonnement</strong>
            <p>
              <button
                className="btn btn--link"
                onClick={() => navigate('/premium/upgrade')}
              >
                Opgrader til premium
              </button>
              {' '}for at få adgang til tilpassede ordpakker og spille uden reklamer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
