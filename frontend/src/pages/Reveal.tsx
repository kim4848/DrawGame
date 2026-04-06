import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRevealData, markDone } from '../api';
import { useGameStore } from '../store/gameStore';
import type { ChainRevealDto } from '../types';

export default function Reveal() {
  const navigate = useNavigate();
  const { roomId, playerId, hostId, clear } = useGameStore();
  const [chains, setChains] = useState<ChainRevealDto[]>([]);
  const [chainIndex, setChainIndex] = useState(0);
  const [entryIndex, setEntryIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }
    getRevealData(roomId).then((data) => {
      setChains(data.chains);
      setLoaded(true);
    }).catch(() => navigate('/'));
  }, [roomId, navigate]);

  if (!loaded) {
    return (
      <div className="clay-bg flex items-center justify-center">
        <p className="text-warm-mid text-lg font-heading font-medium">Indlæser...</p>
      </div>
    );
  }

  const allDone = chainIndex >= chains.length;

  if (allDone) {
    const isHost = playerId === hostId;
    return (
      <div className="clay-bg flex flex-col items-center justify-center p-4">
        <div className="clay-card p-8 text-center max-w-md">
          <h1 className="font-heading text-3xl font-bold mb-4 text-warm-dark">
            Spillet er slut – tak for denne gang!
          </h1>
          {isHost ? (
            <button
              onClick={async () => {
                if (roomId && playerId) await markDone(roomId, playerId).catch(() => {});
                clear();
                navigate('/');
              }}
              className="clay-btn clay-btn-primary px-8 py-3 text-lg"
            >
              Tilbage til start
            </button>
          ) : (
            <button
              onClick={() => { clear(); navigate('/'); }}
              className="clay-btn clay-btn-soft px-8 py-3 text-lg"
            >
              Tilbage til start
            </button>
          )}
        </div>
      </div>
    );
  }

  const chain = chains[chainIndex];
  const visibleEntries = chain.entries.slice(0, entryIndex + 1);
  const hasMore = entryIndex < chain.entries.length - 1;

  const handleNext = () => {
    if (hasMore) {
      setEntryIndex(entryIndex + 1);
    } else {
      setChainIndex(chainIndex + 1);
      setEntryIndex(0);
    }
  };

  return (
    <div className="clay-bg flex flex-col items-center p-4">
      <h1 className="font-heading text-3xl font-bold mb-2 text-warm-dark">Hvad skete der?</h1>
      <p className="text-warm-mid mb-6 font-medium">
        Kæde {chainIndex + 1} af {chains.length} — startet af <strong>{chain.originPlayerName}</strong>
      </p>

      <div className="w-full max-w-lg space-y-4 mb-6">
        {visibleEntries.map((entry, i) => (
          <div
            key={i}
            className="clay-card p-4 animate-fade-slide-in"
          >
            <p className="text-xs text-warm-light mb-1 font-heading font-medium">
              Runde {entry.roundNumber + 1} — {entry.playerName}
            </p>
            {entry.type === 'DRAW' ? (
              <img
                src={entry.content || ''}
                alt={`Tegning af ${entry.playerName}`}
                className="w-full rounded-[var(--radius-clay-sm)] border-2 border-warm-border"
              />
            ) : (
              <p className="text-lg font-semibold text-warm-dark">
                {entry.type === 'WORD' ? '📝' : '💬'} {entry.content}
              </p>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleNext}
        className="clay-btn clay-btn-primary px-8 py-3 text-lg"
      >
        {hasMore ? 'Næste' : chainIndex < chains.length - 1 ? 'Næste kæde' : 'Se resultat'}
      </button>
    </div>
  );
}
