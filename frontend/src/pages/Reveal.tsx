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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Indlæser...</p>
      </div>
    );
  }

  const allDone = chainIndex >= chains.length;

  if (allDone) {
    const isHost = playerId === hostId;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">Spillet er slut – tak for denne gang!</h1>
        {isHost && (
          <button
            onClick={async () => {
              if (roomId && playerId) await markDone(roomId, playerId).catch(() => {});
              clear();
              navigate('/');
            }}
            className="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600"
          >
            Tilbage til start
          </button>
        )}
        {!isHost && (
          <button
            onClick={() => { clear(); navigate('/'); }}
            className="px-8 py-3 bg-gray-500 text-white rounded-lg text-lg font-semibold hover:bg-gray-600"
          >
            Tilbage til start
          </button>
        )}
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
    <div className="min-h-screen flex flex-col items-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Hvad skete der?</h1>
      <p className="text-gray-500 mb-6">
        Kæde {chainIndex + 1} af {chains.length} — startet af <strong>{chain.originPlayerName}</strong>
      </p>

      <div className="w-full max-w-lg space-y-4 mb-6">
        {visibleEntries.map((entry, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm animate-in fade-in"
          >
            <p className="text-xs text-gray-400 mb-1">
              Runde {entry.roundNumber + 1} — {entry.playerName}
            </p>
            {entry.type === 'DRAW' ? (
              <img
                src={entry.content || ''}
                alt={`Tegning af ${entry.playerName}`}
                className="w-full rounded border border-gray-100"
              />
            ) : (
              <p className="text-lg font-medium text-gray-800">
                {entry.type === 'WORD' ? '📝' : '💬'} {entry.content}
              </p>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleNext}
        className="px-8 py-3 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600"
      >
        {hasMore ? 'Næste' : chainIndex < chains.length - 1 ? 'Næste kæde' : 'Se resultat'}
      </button>
    </div>
  );
}
