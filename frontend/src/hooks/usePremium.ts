import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';
import { getSubscription } from '../api';
import type { SubscriptionResponse } from '../api';

export interface PremiumFeature {
  id: string;
  name: string;
  requiresPremium: boolean;
}

export function usePremium() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [upsellModalOpen, setUpsellModalOpen] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<string>('');
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      getSubscription()
        .then(setSubscription)
        .catch(() => setSubscription(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Check if user has premium subscription
  const isPremium = isAuthenticated && subscription?.isPremium === true;

  const checkFeatureAccess = (featureName: string, requiresPremium: boolean): boolean => {
    if (!requiresPremium) return true;
    if (isPremium) return true;

    // Show upsell modal for locked feature
    setCurrentFeature(featureName);
    setUpsellModalOpen(true);
    return false;
  };

  const handleUpgrade = () => {
    setUpsellModalOpen(false);
    navigate('/premium/upgrade');
  };

  const closeUpsellModal = () => {
    setUpsellModalOpen(false);
    setCurrentFeature('');
  };

  const refreshSubscription = async () => {
    if (isAuthenticated) {
      try {
        const sub = await getSubscription();
        setSubscription(sub);
      } catch (error) {
        console.error('Failed to refresh subscription:', error);
      }
    }
  };

  return {
    isPremium,
    isAuthenticated,
    loading,
    checkFeatureAccess,
    upsellModalOpen,
    currentFeature,
    handleUpgrade,
    closeUpsellModal,
    refreshSubscription,
    subscriptionStatus: {
      isPremium,
      status: subscription?.status || 'free',
      expiresAt: subscription?.currentPeriodEnd,
    },
  };
}
