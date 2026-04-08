import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRevealData, markDone, playAgain, joinRoom } from '../api';
import { useGameStore } from '../store/gameStore';
import { useRoomPoll } from '../hooks/useRoomPoll';
import { addToast } from '../store/toastStore';
import type { ChainRevealDto } from '../types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function exportChainAsImage(chain: ChainRevealDto): Promise<Blob> {
  const W = 600;
  const PAD = 24;
  const INNER = W - PAD * 2;
  const headerH = 56;
  const entryLabelH = 28;
  const textEntryH = 52;
  const imgH = 340;
  const gapH = 16;

  // Pre-load all drawing images
  const images: (HTMLImageElement | null)[] = await Promise.all(
    chain.entries.map((e) =>
      e.type === 'DRAW' && e.content ? loadImage(e.content).catch(() => null) : Promise.resolve(null)
    )
  );

  // Calculate total height
  let totalH = headerH + PAD;
  for (let i = 0; i < chain.entries.length; i++) {
    totalH += entryLabelH;
    const entry = chain.entries[i];
    if (entry.type === 'DRAW' && images[i]) {
      const img = images[i]!;
      const scaledH = Math.min(imgH, (img.height / img.width) * INNER);
      totalH += scaledH + gapH;
    } else {
      totalH += textEntryH + gapH;
    }
  }
  totalH += PAD;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 0, W, totalH);

  // Header
  ctx.fillStyle = '#FF6B6B';
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Startet af ${chain.originPlayerName}`, PAD, headerH / 2);

  let y = headerH + PAD;

  for (let i = 0; i < chain.entries.length; i++) {
    const entry = chain.entries[i];

    // Entry label
    ctx.fillStyle = '#999';
    ctx.font = '13px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(`Runde ${entry.roundNumber + 1} — ${entry.playerName}`, PAD, y);
    y += entryLabelH;

    if (entry.type === 'DRAW' && images[i]) {
      const img = images[i]!;
      const scaledH = Math.min(imgH, (img.height / img.width) * INNER);
      // Draw border
      ctx.strokeStyle = '#E0D5C5';
      ctx.lineWidth = 2;
      ctx.strokeRect(PAD - 1, y - 1, INNER + 2, scaledH + 2);
      ctx.drawImage(img, PAD, y, INNER, scaledH);
      y += scaledH + gapH;
    } else {
      const prefix = entry.type === 'WORD' ? '\u{1F4DD} ' : '\u{1F4AC} ';
      ctx.fillStyle = '#2D2A26';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(prefix + (entry.content || ''), PAD, y + 4);
      y += textEntryH + gapH;
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas export failed'));
    }, 'image/png');
  });
}

export default function Reveal() {
  const navigate = useNavigate();
  const { roomId, playerId, hostId, players, nextRoomCode, clear, setPlayer, setRoom, setHostId } = useGameStore();
  const [chains, setChains] = useState<ChainRevealDto[]>([]);
  const [chainIndex, setChainIndex] = useState(0);
  const [entryIndex, setEntryIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [starting, setStarting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleShareChain = useCallback(async () => {
    if (exporting || chainIndex >= chains.length) return;
    setExporting(true);
    try {
      const blob = await exportChainAsImage(chains[chainIndex]);
      const file = new File([blob], `kaede-${chainIndex + 1}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Hearsay - kæde' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Kæde downloadet!', 'success');
      }
    } catch {
      addToast('Kunne ikke eksportere kæden.', 'error');
    } finally {
      setExporting(false);
    }
  }, [exporting, chainIndex, chains]);

  useRoomPoll();

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }
    // Only fetch reveal data once on mount — don't re-fetch when roomId changes (play-again)
    if (!loaded) {
      getRevealData(roomId).then((data) => {
        setChains(data.chains);
        setLoaded(true);
      }).catch(() => navigate('/'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Non-host: auto-join new room when host starts play-again
  useEffect(() => {
    if (!nextRoomCode || !playerId) return;
    const isHost = playerId === hostId;
    if (isHost) return;

    const myName = players.find((p) => p.id === playerId)?.name;
    if (!myName) return;

    joinRoom(nextRoomCode, myName).then((res) => {
      setPlayer(res.playerId);
      setRoom(res.roomId, nextRoomCode);
      setHostId('');
      navigate('/lobby');
    }).catch(() => {
      addToast('Kunne ikke deltage i nyt spil.', 'error');
    });
  }, [nextRoomCode, playerId, hostId, players, navigate, setPlayer, setRoom, setHostId]);

  if (!loaded) {
    return (
      <div className="clay-bg flex items-center justify-center">
        <p className="text-warm-mid text-lg font-heading font-medium">Indlæser...</p>
      </div>
    );
  }

  const isHost = playerId === hostId;
  const allDone = chainIndex >= chains.length;

  if (allDone) {
    const handlePlayAgain = async () => {
      if (!roomId || !playerId || starting) return;
      setStarting(true);
      try {
        const res = await playAgain(roomId, playerId);
        // Clear old game state before setting new room
        // This prevents Lobby's useEffect from redirecting based on stale roomStatus
        useGameStore.setState({
          roomStatus: null,
          players: [],
          assignment: null,
          allSubmitted: false,
          hasSubmitted: false,
          currentRound: 0,
          totalRounds: 0,
          roundType: null,
          nextRoomCode: null,
        });
        // Set new room/player IDs
        setPlayer(res.playerId);
        setRoom(res.roomId, res.roomCode);
        setHostId(res.playerId);
        addToast('Nyt spil oprettet!', 'success');
        // Use replace to prevent back-button returning to reveal
        navigate('/lobby', { replace: true });
      } catch (e: unknown) {
        addToast((e instanceof Error && e.message) || 'Kunne ikke starte nyt spil.', 'error');
        setStarting(false);
      }
    };

    return (
      <div className="clay-bg flex flex-col items-center justify-center p-4">
        <div className="clay-card p-8 text-center max-w-md">
          <h1 className="font-heading text-3xl font-bold mb-4 text-warm-dark">
            Spillet er slut – tak for denne gang!
          </h1>
          <div className="flex flex-col gap-3">
            {isHost ? (
              <>
                <button
                  onClick={handlePlayAgain}
                  disabled={starting}
                  className="clay-btn clay-btn-primary px-8 py-3 text-lg"
                >
                  {starting ? 'Opretter...' : 'Spil igen'}
                </button>
                <button
                  onClick={async () => {
                    if (roomId && playerId) await markDone(roomId, playerId).catch(() => {});
                    clear();
                    navigate('/');
                  }}
                  className="clay-btn clay-btn-soft px-8 py-3 text-lg"
                >
                  Tilbage til start
                </button>
              </>
            ) : (
              <>
                <p className="text-warm-mid text-sm font-medium">Venter på at værten starter nyt spil...</p>
                <button
                  onClick={() => { clear(); navigate('/'); }}
                  className="clay-btn clay-btn-soft px-8 py-3 text-lg"
                >
                  Tilbage til start
                </button>
              </>
            )}
          </div>
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
            <p className="text-xs text-warm-mid mb-1 font-heading font-medium">
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
                {entry.type === 'WORD' ? '\u{1F4DD}' : '\u{1F4AC}'} {entry.content}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        {!hasMore && (
          <button
            onClick={handleShareChain}
            disabled={exporting}
            className="clay-btn clay-btn-secondary px-6 py-3 text-lg"
          >
            {exporting ? 'Eksporterer...' : 'Del kæde'}
          </button>
        )}
        <button
          onClick={handleNext}
          className="clay-btn clay-btn-primary px-8 py-3 text-lg"
        >
          {hasMore ? 'Næste' : chainIndex < chains.length - 1 ? 'Næste kæde' : 'Se resultat'}
        </button>
      </div>
    </div>
  );
}
