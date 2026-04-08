import PremiumBadge from './PremiumBadge';
import './SubscriptionStatus.css';

interface SubscriptionStatusProps {
  isPremium: boolean;
  expiresAt?: string;
  onManageSubscription?: () => void;
  onUpgrade?: () => void;
}

export default function SubscriptionStatus({
  isPremium,
  expiresAt,
  onManageSubscription,
  onUpgrade,
}: SubscriptionStatusProps) {
  const formatExpiryDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isExpiringSoon = (() => {
    if (!expiresAt) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  })();

  return (
    <div className={`subscription-status ${isPremium ? 'subscription-status--premium' : 'subscription-status--free'}`}>
      {isPremium ? (
        <>
          <div className="subscription-status__header">
            <PremiumBadge variant="large" />
            <span className="subscription-status__label">Aktiv abonnement</span>
          </div>
          {expiresAt && (
            <p className={`subscription-status__expiry ${isExpiringSoon ? 'subscription-status__expiry--warning' : ''}`}>
              {isExpiringSoon && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
                    fill="currentColor"
                  />
                </svg>
              )}
              Fornyes {formatExpiryDate(expiresAt)}
            </p>
          )}
          {onManageSubscription && (
            <button className="btn btn--secondary btn--sm" onClick={onManageSubscription}>
              Administrer abonnement
            </button>
          )}
        </>
      ) : (
        <>
          <div className="subscription-status__header">
            <span className="subscription-status__label">Gratis bruger</span>
          </div>
          <p className="subscription-status__message">
            Opgrader til Premium for tilpassede ordpakker, ingen reklamer og meget mere.
          </p>
          {onUpgrade && (
            <button className="btn btn--primary btn--sm" onClick={onUpgrade}>
              Se Premium-fordele
            </button>
          )}
        </>
      )}
    </div>
  );
}
