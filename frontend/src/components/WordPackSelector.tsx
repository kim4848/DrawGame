import { useEffect, useState } from 'react';
import { getWordPacks } from '../api';
import { usePremium } from '../hooks/usePremium';
import PremiumBadge from './PremiumBadge';
import type { WordPack } from '../types';

interface WordPackSelectorProps {
  selectedPackId?: string;
  onSelect: (packId: string) => void;
}

export default function WordPackSelector({ selectedPackId, onSelect }: WordPackSelectorProps) {
  const [packs, setPacks] = useState<WordPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const { isPremium, checkFeatureAccess } = usePremium();

  useEffect(() => {
    getWordPacks()
      .then((data) => {
        setPacks(data);
        // Auto-select default pack if no selection
        if (!selectedPackId) {
          const defaultPack = data.find((p) => p.isDefault);
          if (defaultPack) {
            onSelect(defaultPack.id);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load word packs:', err);
      })
      .finally(() => setLoading(false));
  }, [selectedPackId, onSelect]);

  const selectedPack = packs.find((p) => p.id === selectedPackId);

  const handleSelect = (pack: WordPack) => {
    if (pack.isPremium && !isPremium) {
      const hasAccess = checkFeatureAccess(pack.name, true);
      if (!hasAccess) return;
    }
    onSelect(pack.id);
    setExpanded(false);
  };

  if (loading) {
    return (
      <div className="clay-card p-3 w-full">
        <p className="text-warm-mid text-sm text-center">Indlæser ordpakker...</p>
      </div>
    );
  }

  if (packs.length === 0) {
    return null;
  }

  return (
    <div className="clay-card p-3 w-full">
      <p className="text-warm-mid text-sm font-medium mb-2 text-center">Ordpakke</p>

      {/* Selected pack display (button to expand) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="clay-btn clay-btn-soft w-full px-3 py-2.5 text-sm min-h-[44px] flex items-center justify-between"
        aria-expanded={expanded}
        aria-haspopup="listbox"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="truncate">{selectedPack?.name || 'Vælg ordpakke'}</span>
          {selectedPack?.isPremium && <PremiumBadge variant="small" />}
        </span>
        <svg
          className={`w-4 h-4 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Pack list (expanded dropdown) */}
      {expanded && (
        <div
          className="mt-2 space-y-2 max-h-[280px] overflow-y-auto"
          role="listbox"
          aria-label="Tilgængelige ordpakker"
        >
          {packs.map((pack) => {
            const isSelected = pack.id === selectedPackId;
            const isLocked = pack.isPremium && !isPremium;

            return (
              <button
                key={pack.id}
                onClick={() => handleSelect(pack)}
                disabled={isLocked}
                className={`w-full text-left px-3 py-2.5 rounded-[var(--radius-clay-sm)] border-2 transition-colors ${
                  isSelected
                    ? 'bg-coral-light border-coral text-warm-dark'
                    : isLocked
                    ? 'bg-warm-border border-warm-border-dark text-warm-mid cursor-not-allowed opacity-60'
                    : 'bg-white border-warm-border hover:border-coral-light hover:bg-coral-light/20'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-sm">{pack.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {pack.isPremium && <PremiumBadge variant="small" />}
                    {isLocked && (
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-label="Låst"
                      >
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-xs text-warm-mid leading-relaxed">{pack.description}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected pack description (when collapsed) */}
      {!expanded && selectedPack && (
        <p className="text-xs text-warm-mid mt-2 text-center leading-relaxed">
          {selectedPack.description}
        </p>
      )}
    </div>
  );
}
