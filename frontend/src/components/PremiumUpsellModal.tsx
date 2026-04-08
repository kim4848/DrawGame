import './PremiumUpsellModal.css';

interface PremiumUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  onUpgrade: () => void;
}

export default function PremiumUpsellModal({
  isOpen,
  onClose,
  featureName,
  onUpgrade,
}: PremiumUpsellModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="upsell-title">
      <div className="modal-content premium-upsell" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Luk"
        >
          ×
        </button>

        <div className="premium-upsell__header">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill="#fbbf24"
            />
          </svg>
          <h2 id="upsell-title" className="premium-upsell__title">
            Opgrader til Premium
          </h2>
        </div>

        <div className="premium-upsell__body">
          <p className="premium-upsell__message">
            <strong>{featureName}</strong> er en premium-funktion.
          </p>

          <div className="premium-upsell__features">
            <h3 className="premium-upsell__features-title">Premium inkluderer:</h3>
            <ul className="premium-upsell__features-list">
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
                </svg>
                Tilpassede ordpakker
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
                </svg>
                Ingen reklamer
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
                </svg>
                Prioriteret support
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
                </svg>
                Flere temaer og farver
              </li>
            </ul>
          </div>

          <div className="premium-upsell__price">
            <span className="premium-upsell__price-amount">29 kr.</span>
            <span className="premium-upsell__price-period">/ måned</span>
          </div>
        </div>

        <div className="premium-upsell__actions">
          <button className="btn btn--primary" onClick={onUpgrade}>
            Opgrader nu
          </button>
          <button className="btn btn--secondary" onClick={onClose}>
            Måske senere
          </button>
        </div>
      </div>
    </div>
  );
}
