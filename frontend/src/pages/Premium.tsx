import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePremium } from '../hooks/usePremium';
import SubscriptionStatus from '../components/SubscriptionStatus';
import PremiumBadge from '../components/PremiumBadge';
import PremiumFeatureLock from '../components/PremiumFeatureLock';
import PremiumUpsellModal from '../components/PremiumUpsellModal';
import '../styles/Premium.css';

export default function Premium() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    isPremium,
    subscriptionStatus,
    loading,
    upsellModalOpen,
    currentFeature,
    handleUpgrade,
    closeUpsellModal,
  } = usePremium();

  const handleManageSubscription = () => {
    navigate('/premium/manage');
  };

  const handleUpgradeFlow = () => {
    navigate('/premium/upgrade');
  };

  if (loading) {
    return (
      <div className="container premium-loading">
        <h1>Premium</h1>
        <p>Indlæser...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container premium-auth-required">
        <h1>Premium abonnement</h1>
        <div className="premium-auth-required__content">
          <p>Du skal være logget ind for at se dit abonnement.</p>
          <button className="btn btn--primary" onClick={() => navigate('/login')}>
            Log ind
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container premium-container">
      <h1 className="premium-title">
        Premium
        {isPremium && <PremiumBadge variant="large" />}
      </h1>

      <div className="premium-status-section">
        <SubscriptionStatus
          isPremium={subscriptionStatus.isPremium}
          expiresAt={subscriptionStatus.expiresAt}
          onManageSubscription={isPremium ? handleManageSubscription : undefined}
          onUpgrade={!isPremium ? handleUpgradeFlow : undefined}
        />
      </div>

      <div className="premium-features-section">
        <h2 className="premium-features-heading">Premium-funktioner</h2>

        <div className="premium-features-grid">
          <div>
            <h3 className="premium-feature-heading">Tilpassede ordpakker</h3>
            <PremiumFeatureLock
              isLocked={!isPremium}
              featureName="Tilpassede ordpakker"
              onUpgradeClick={handleUpgradeFlow}
            >
              <div className="premium-feature-content">
                <p>Her kan du vælge mellem forskellige ordpakker:</p>
                <ul>
                  <li>Standard dansk</li>
                  <li>Sjove udtryk</li>
                  <li>Film og TV</li>
                  <li>Mad og drikke</li>
                  <li>Dyr og natur</li>
                </ul>
              </div>
            </PremiumFeatureLock>
          </div>

          <div>
            <h3 className="premium-feature-heading">Ingen reklamer</h3>
            <div className={`premium-feature-section ${isPremium ? 'premium-feature-section--unlocked' : ''}`}>
              <p>
                {isPremium
                  ? '✓ Du ser ingen reklamer i spillet!'
                  : 'Premium-brugere ser ingen reklamer.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <PremiumUpsellModal
        isOpen={upsellModalOpen}
        onClose={closeUpsellModal}
        featureName={currentFeature}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
