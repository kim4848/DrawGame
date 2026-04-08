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
    <div className="w-full">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="clay-btn clay-btn-soft w-full px-3 py-2 text-sm min-h-[44px] flex items-center justify-center gap-2"
        aria-expanded={expanded}
        aria-label="Ordpakke"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span className="text-warm-mid flex items-center gap-1.5 truncate">
          {selectedPack?.name || 'Vælg ordpakke'}
          {selectedPack?.isPremium && <PremiumBadge variant="small" />}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`text-warm-mid transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Pack list (expanded) */}
      {expanded && (
        <div className="clay-card p-3 mt-2 w-full">
          <div
            className="space-y-2 max-h-[280px] overflow-y-auto"
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
        </div>
      )}
    </div>
  );
}
