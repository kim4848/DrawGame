import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { startGame } from '../api';
import { useGameStore } from '../store/gameStore';
import { useRoomPoll } from '../hooks/useRoomPoll';

export default function Lobby() {
  const navigate = useNavigate();
  const { roomId, roomCode, playerId, hostId, roomStatus, players } = useGameStore();

  useRoomPoll();

  useEffect(() => {
    if (!roomId || !playerId) {
      navigate('/');
      return;
    }
    if (roomStatus === 'ACTIVE') navigate('/play');
    if (roomStatus === 'REVEAL') navigate('/reveal');
  }, [roomId, playerId, roomStatus, navigate]);

  const [copied, setCopied] = useState(false);

  const shareLink = `${window.location.origin}/join/${roomCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isHost = playerId === hostId;
  const canStart = isHost && players.length >= 2;

  const handleStart = async () => {
    if (!roomId || !playerId) return;
    try {
      await startGame(roomId, playerId);
    } catch (e: any) {
      alert(e.message || 'Kunne ikke starte spillet.');
    }
  };

  return (
    <div className="clay-bg flex flex-col items-center justify-center p-4">
      <h1 className="font-heading text-3xl font-bold mb-2 text-warm-dark">Lobby</h1>

      <div className="mb-6 text-center">
        <p className="text-warm-mid text-sm mb-1 font-medium">Rumkode</p>
        <p className="font-heading text-4xl font-bold tracking-widest text-coral" data-testid="room-code">
          {roomCode}
        </p>
        {roomCode && (
          <div className="mt-4 clay-card inline-block p-3">
            <QRCodeSVG value={shareLink} size={160} />
          </div>
        )}
        <p className="text-warm-light text-sm mt-2">Scan for at deltage</p>
        <button
          onClick={handleCopyLink}
          className="clay-btn clay-btn-soft mt-2 px-4 py-2 text-sm"
        >
          {copied ? 'Link kopieret!' : 'Kopiér invitationslink'}
        </button>
      </div>

      <div className="w-full max-w-sm mb-6">
        <h2 className="font-heading text-lg font-semibold mb-2 text-warm-dark">
          Spillere ({players.length})
        </h2>
        <ul className="space-y-2">
          {players.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-clay-sm)] border-2 ${
                p.isActive
                  ? 'bg-white border-warm-border'
                  : 'bg-cream-dark border-warm-border text-warm-light'
              }`}
            >
              <span className={`w-3 h-3 rounded-full border-2 ${
                p.isActive
                  ? 'bg-mint border-mint-dark'
                  : 'bg-warm-border border-warm-border-dark'
              }`} />
              <span className="font-medium">{p.name}</span>
              {p.id === hostId && (
                <span className="ml-auto text-xs text-coral font-heading font-bold">Vært</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="clay-btn clay-btn-primary px-8 py-3 text-lg"
        >
          {canStart ? 'Start spillet' : `Venter på spillere... (min. 2)`}
        </button>
      ) : (
        <p className="text-warm-mid text-lg font-medium">Venter på at værten starter spillet...</p>
      )}
    </div>
  );
}
